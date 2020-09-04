var db = require('./lib/db.js');
var template = require('./lib/template.js');
var qs = require('querystring');
var bodyParser = require('body-parser');
var compression = require('compression');

const express = require('express');
const app = express();
const port = 3000;

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
         `<h2>${title}</h2>${description}<br>
         <img src="/images/TEST_IMG.jpg"><img>`,
         `<a href="/page/create">create</a><br>`
       );
       res.send(html);
 });

/* router 사용을 위해 각 페이지마다 접속 url 값을 수정했다.
 이때, 본래처럼 /page/:id가 상위에 위치하게 되면
 라우터를 위에서부터 순서대로 탐색할 때 문제가 생긴다.
 
 왜 생긴다는진 잘 모르겠는데.. /create 자체를
 파일 위치가 아닌 예약어로 인식하기 위해서 그래야 한단다.


*/
 app.get('/page/create',(req,res) => {
       db.query('SELECT * FROM author', function (error2, author) {
         if(error2) throw error2
       var title = 'WEB - create';
       var list = template.list(req.topics);
       var html = template.HTML(title, list, `
         <form action="/page/create_process" method="post">
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

 app.post('/page/create_process',(req,res) => {
     var post = req.body;
     db.query('INSERT INTO topic (title,description,created,author_id) VALUES (?,?,NOW(),?)'
     ,[post.title,post.description,post.author], function(error,topics) {
       if(error) throw error;
       res.redirect(302, `/page/${topics.insertId}`);
     });
 });

 app.get('/page/update/:id',(req,res) => {
     db.query(`SELECT * FROM topic WHERE id=?`
       ,[req.params.id],function(error2,topic){
       if(error2) throw error2
        var title = 'Web - update';
        var list = template.list(req.topics);
        var html = template.HTML(title, list,
         `<form action="/page/update_process" method="post">
           <input type="hidden" name="id" value="${topic[0].id}">
             <p><input type="text" name="title" placeholder="title" value="${topic[0].title}"></p>
             <p><textarea name="description" placeholder="description">${topic[0].description}</textarea></p>
             <p><input type="submit"></p></form>`,
             `<a href="/create">create</a> <a href="/page/update?id=${topic[0].id}">update</a>`
            );
            res.send(html);
     });
 });

 app.post('/page/update_process',(req,res) => {
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

app.get('/page/:id',(req,res,next)=> {
    db.query(`SELECT * FROM topic, author WHERE topic.author_id = author.id AND topic.id=?`
    , [req.params.id], function(err, topic){
      if(err) {
        next(err);
      } else {
        var title = topic[0].title;
        var description = topic[0].description;
        var author = topic[0].name;
        var list = template.list(req.topics);
        var html = template.HTML(title, list,
        `<h2>${title}</h2>${description}<br>by ${author}`,
        ` <a href="/page/create">create</a>
          <a href="/page/update/${req.params.id}">update</a>
          <form action="/page/delete_process" method="post">
            <input type="hidden" name="id" value="${req.params.id}">
            <input type="submit" value="delete">
          </form>`
      );
        res.send(html);
      }
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
