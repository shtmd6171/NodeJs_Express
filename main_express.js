/* npm install express --save 를 통해 설치한다.
이 때, save는 dependencies에 기록하여
차후에 install로만으로도 설치를 가능하게 한다
*/

const express = require('express')
const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
