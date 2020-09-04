/* 미들웨어는 express에서 라우팅과 같이 중요한 요소 중 하나이다.

   미들웨어 함수는 request 오브젝트, response 오브젝트
   애플리케이션의 요청-응답 사이에 일어나는 도중 다음 미들웨어 함수에 대한
   액세스 권한을 갖는 함수이다.

   즉, 요청과 응답이 실행되는 동안, 실행되는 함수들의 목록을 의미한다.
   미들웨어 함수는
   1. 요청한 클라이언트에게 응답
   2. 다른 미들웨어 함수를 호출 하는 일을 한다.

   우리는 현재 js파일에서 미들웨어를 사용한다.
   사용하는 미들웨어는 서브파티 미들웨어이고 그 중 body-parser를 사용한다.
   npm install body-parser --save

   추가적으로 다른 미들웨어도 사용해보자
   compression은 보여지는 데이터 양을 압축하는 미들웨어이다.
   npm install compression --save

*/
var db = require('./lib/db.js');
var template = require('./lib/template.js');
var qs = require('querystring');
// body-parser 사용에 필요한 모듈
var bodyParser = require('body-parser');
// compression 사용에 필요한 모듈
var compression = require('compression');
const express = require('express');
const app = express();
const port = 3000;

/* 미들웨어를 표기하는 표현식
   사용자의 리퀘스트가 생길 때마다 use() 내부의 미들웨어를 실행한다.

   use() 내부의 표현식은 미들웨어를 생성하는 함수이다.
   그리고 이 함수는 그 반환값으로 미들웨어 함수를 사용할 값을 지니고 있다.
   우리는 app.use()를 사용하여,
   반환된 미들웨어 함수를 실제 원래의 함수처럼 사용하겠다는 뜻이다.

   이 예제에서는 원래는 존재하지 않았던 body()라는 미들웨어 함수를
   req의 파라메타 밑에 실제로 존재하는 함수처럼 사용했다. (req.body())

*/
app.use(bodyParser.urlencoded({ extended: false }));
// compression 미들웨어 사용
app.use(compression());

/* 직접 미들웨어를 만드는 방법
미들웨어 함수에 세 파리미터가 필수적으로 들어간다
현재는 app.use의 방식을 이전과 같이 동일하게 사용했지만,
예를들어 get 방식으로 라우팅하는 모든 접속에 미들웨어를 한정적으로 이용하고 싶다면
app.get('*',(req, res, next) =>{}... 와 같은 방식으로 사용할 수 있다.

이 외에도, app.use('page/:id', ...) 같이 라우터 경로만으로 한정적으로 이용할 수 있다.
미들웨어의 여러 사용 방식은 http://expressjs.com/en/guide/using-middleware.html
*/
app.use((req, res, next)=>{
  // topic 테이블 전체를 부르는 쿼리문을 req 하위의 topics으로 생성하는 미들웨어이다.
   db.query('SELECT * FROM topic', function (error, topics) {
       req.topics = topics;
       // next()는 다음 미들웨어 함수를 호출하는 역할을 한다.
       next();
   });
});

 app.get('/', (req, res) => {
       var title = 'Welcome';
       var description = 'Hello, Node.js';
       var list = template.list(req.topics);
       var html = template.HTML(title, list,
         `<h2>${title}</h2>${description}`,
         `<a href="/create">create</a>`
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
    /* 기존의 qs.parse(body);를 사용해 req.on()을 통해 body 변수에
       데이터를 하나씩 받아 왔으나, 미들웨어함수인 .body를 이용하면
       아래와 같은 이전의 과정이 필요하지 않게 된다.
       var body = '';
       req.on('data', (data) => {
         body += data;
       });
       req.on('end', () => {
         var post = qs.parse(body); ...
    */
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
