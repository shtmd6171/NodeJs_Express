/* npm install express --save 를 통해 설치한다.
이 때, save는 dependencies에 기록하여
차후에 install로만으로도 설치를 가능하게 한다

mysql 사용을 위해 npm install mysql--save도 사용해둔다
*/
var db = require('./lib/db.js');
var template = require('./lib/template.js');
var qs = require('querystring');
const express = require('express')
const app = express()
const port = 3000

/* app.get(path, callback [, callback ...])
app의 하위 메소드에는 get(), post(), delete() 등 라우팅 메소드를 지원한다.
우리는 callback함수를 통해, path 경로에 따라 라우팅이 가능하다.

app.get('/',function(req,res){ return res.send("hello World!")}); 와 같다.
*/
app.get('/', (req, res) => {
  db.query('SELECT * FROM topic', function (error, topics) {
      var title = 'Welcome';
      var description = 'Hello, Node.js';
      var list = template.list(topics);
      var html = template.HTML(title, list,
        `<h2>${title}</h2>${description}`,
        `<a href="/create">create</a>`
      );
      /* 기존의 방식에서는
      createServer(function(request,response)를 통한 response 파라메타를
      전체에 걸쳐 나눠쓰고 있었다.
      그러나 express의 라우팅 방식을 사용하면 path경로에 따라 해당 위치에서만
      response를 사용할 수 있다. 그리고 이는 복잡성을 제거하고 가독성을 높이는 효과가 있다. */
      res.send(html);
  });
});

  /* route path 방식을 이용,
     요청을 통해 /:id 와 같은 방식으로 URL을 설정할 수 있다.
     이 때 request.params를 통해 해당 URL를 오브젝트로 확인할 수 있다.
     params.id 와 같은 방식 통해서 여러 파라메타 중 하나를 지정할 수 있다.

     기존에는 QueryData.Id 를 통해, ?id= 의 값을 가져왔었다.
  */
app.get('/page/:id',(req,res)=> {
  db.query('SELECT * FROM topic', function(error, topics){
    if(error) throw error
    db.query(`SELECT * FROM topic, author WHERE topic.author_id = author.id AND topic.id=?`
    , [req.params.id], function(error2, topic){
      if(error2) throw error
        var title = topic[0].title;
        var description = topic[0].description;
        var author = topic[0].name;
        var list = template.list(topics);
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
});

app.get('/create',(req,res) => {
  db.query('SELECT * FROM topic', function (error, topics) {
    if(error) throw error
      db.query('SELECT * FROM author', function (error2, author) {
        if(error2) throw error2
      var title = 'WEB - create';
      var list = template.list(topics);
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
});

app.post('/create_process',(req,res) => {
  var body = '';
  req.on('data', (data) => {
    body += data;
  });
  req.on('end', () => {
    var post = qs.parse(body);
    db.query('INSERT INTO topic (title,description,created,author_id) VALUES (?,?,NOW(),?)'
    ,[post.title,post.description,post.author], function(error,topics) {
      if(error) throw error;
      res.redirect(302, `/page/${topics.insertId}`);
    });
  });
});

app.get('/update/:id',(req,res) => {
  db.query('SELECT * FROM topic',function(error,topics){
    if(error) throw error
    db.query(`SELECT * FROM topic WHERE id=?`
      ,[req.params.id],function(error2,topic){
      if(error2) throw error2
       var title = 'Web - update';
       var list = template.list(topics);
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
});

app.post('/update_process',(req,res) => {
  var body = '';
  req.on('data', (data) => {
      body = body + data;
  });
  req.on('end', () => {
      var post = qs.parse(body);
      db.query("UPDATE topic SET title=?, description=? WHERE id = ? "
      , [post.title,post.description,post.id,],function(error,topic){
        if(error) throw error;
        res.redirect(302, `/page/${post.id}`);
      });
  });
});

app.post('/page/delete_process',(req,res) => {
  var body = '';
  req.on('data', (data) => {
    body += data;
  });
  req.on('end', () => {
    var post = qs.parse(body);
    db.query('DELETE FROM topic WHERE id = ? ',[post.id], (error,topics) => {
      if(error) throw error;
      res.redirect(302, `/`);
    });
  });
});


/* app.listen([port[, host[, backlog]]][, callback])
NodeJs의 http.Server.listen()과 같은 역할을 한다.
*/
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
