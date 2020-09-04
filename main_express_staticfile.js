var db = require('./lib/db.js');
var template = require('./lib/template.js');
var qs = require('querystring');
var bodyParser = require('body-parser');
var compression = require('compression');

const express = require('express');
const app = express();
const port = 3000;

/* 이미지, CSS 파일 및 JavaScript 파일과 같은 정적 파일을 제공하기위해
   express.staticExpress에 내장 된 미들웨어 기능을 사용한다.

   app.use(express.static('디렉터리 명'))
   이 이후부터, 디렉토리에있는 파일을 URL로 로드할 수 있다.
   http://localhost:3000/images/TEST_IMG.jpg

   이 경우 URL은 해당 경로 외에는 static()를 통해 생성되어 있지 않기 때문에
   보다 안전하게 파일을 운용할 수 있다.

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

app.get('/page/:id',(req,res)=> {
    db.query(`SELECT * FROM topic, author WHERE topic.author_id = author.id AND topic.id=?`
    , [req.params.id], function(error2, topic){
      if(error2) throw error
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

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
