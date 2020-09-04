var db = require('./lib/db.js');
var template = require('./lib/template.js');
var qs = require('querystring');
var bodyParser = require('body-parser');
var compression = require('compression');

const express = require('express');
const app = express();
const port = 3000;

/* 404 에러처리를 위해 미들웨어를 사용한다.
   단, 미들웨어는 순차적으로 실행되기 때문에 위치는 최하단이 되어야 한다.


*/
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(compression());
app.use((req, res, next)=>{
   db.query('SELECT * FROM topic', function (error, topics) {
       req.topics = topics;
       next();
   });
});

 app.get('/', (req, res) => {
       var title = 'Welcome';
       var description = 'Hello, Node.js';
       var list = template.list(req.topics);
       var html = template.HTML(title, list,
         // img 태그에 /images/TEST_IMG.jpg를 사용. URL를 이용한다
         `<h2>${title}</h2>${description}<br>
         <img src="/images/TEST_IMG.jpg"><img>`,
         `<a href="/create">create</a><br>`
       );
       res.send(html);
 });

// next를 추가로 콜백함수에 이용한다.
app.get('/page/:id',(req,res,next)=> {
    db.query(`SELECT * FROM topic, author WHERE topic.author_id = author.id AND topic.id=?`
    , [req.params.id], function(err, topic){
      if(err) {
        // 만약 db접속 자체에 문제가 생기면 생긴 오류를 다음 미들웨어에게 넘겨준다.
        // 보통의 경우 해당 에러가 출력되는 것으로 마무리되지만
        // 하단의 Write Error Handling을 이용하여 다른 방식으로 처리한다.
        next(err);
      } else {
        // db 접속에 문제가 없다면 실행한다.
        var title = topic[0].title;
        var description = topic[0].description;
        var author = topic[0].name;
        var list = template.list(req.topics);
        var html = template.HTML(title, list,
        `<h2>${title}</h2>${description}<br>by ${author}`,
        ` <a href="/create">create</a>
          <a href="/update/${req.params.id}">update</a>
          <form action="delete_process" method="post">
            <input type="hidden" name="id" value="${req.params.id}">
            <input type="submit" value="delete">
          </form>`
      );
        res.send(html);
      }
    });
});

app.get('/create',(req,res) => {
      db.query('SELECT * FROM author', function (error2, author) {
        if(error2) throw error2
      var title = 'WEB - create';
      var list = template.list(req.topics);
      var html = template.HTML(title, list, `
        <form action="/create_process" method="post">
          <p><input type="text" name="title" placeholder="title"></p>
          <p>
            <textarea name="description" placeholder="description"></textarea>
          </p>
          <p>
            ${template.tagSelect(author)}
          </p>
          <p>
            <input type="submit">
          </p>
        </form>
      `, '');
      res.send(html);
    });
});

app.post('/create_process',(req,res) => {
    var post = req.body;
    db.query('INSERT INTO topic (title,description,created,author_id) VALUES (?,?,NOW(),?)'
    ,[post.title,post.description,post.author], function(error,topics) {
      if(error) throw error;
      res.redirect(302, `/page/${topics.insertId}`);
    });
});

app.get('/update/:id',(req,res) => {
    db.query(`SELECT * FROM topic WHERE id=?`
      ,[req.params.id],function(error2,topic){
      if(error2) throw error2
       var title = 'Web - update';
       var list = template.list(req.topics);
       var html = template.HTML(title, list,
        `<form action="/update_process" method="post">
          <input type="hidden" name="id" value="${topic[0].id}">
            <p><input type="text" name="title" placeholder="title" value="${topic[0].title}"></p>
            <p><textarea name="description" placeholder="description">${topic[0].description}</textarea></p>
            <p><input type="submit"></p></form>`,
            `<a href="/create">create</a> <a href="/update?id=${topic[0].id}">update</a>`
           );
           res.send(html);
    });
});

app.post('/update_process',(req,res) => {
      var post = req.body;
      db.query("UPDATE topic SET title=?, description=? WHERE id = ? "
      , [post.title,post.description,post.id,],function(error,topic){
        if(error) throw error;
        res.redirect(302, `/page/${post.id}`);
      });
});

app.post('/page/delete_process',(req,res) => {
    var post = req.body;
    db.query('DELETE FROM topic WHERE id = ? ',[post.id], (error,topics) => {
      if(error) throw error;
      res.redirect(302, `/`);
    });
});
// 404 에러시 반환되는 미들웨어이다.
app.use(function(req, res, next) {
  res.status(404).send('Sorry cant find that!');
});

/* 이 부분은 에러를 제어하는 미들웨어의 사용을 다룬다. (Write Error Handling)
만약 db문제로 인해, error를 next로 보낸경우,
에러를 파라메타로 포함한 이 곳에서 오류를 처리하게 된다.
이 경우에는 404와는 달리 오류에 따라 다른 처리를 할 수 있게 된다.
*/
app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('DB broken ');
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
