const app = require('express')()
const http = require('http').createServer(app)
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const io = require('socket.io')(http, {
  cors: {
    origin:"*"
  }
})
const triviaAddress = 'https://opentdb.com/api.php?amount=10';

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

app.use('*',cors());
app.use(bodyParser.json());


var connections = [];
var games = [];

const connectUser = (id) => {
  if (connections[connections.indexOf(id)] == undefined) {
    connections.push(id);
  }
}
const disconnectUser = (id) => {
  if (connections[connections.indexOf(id)] != undefined) {
    connections.splice(connections.indexOf(id),1);
  }
}

function decodeEntities(encodedString) {
  var translate_re = /&(nbsp|amp|quot|lt|gt);/g;
  var translate = {
      "nbsp":" ",
      "amp" : "&",
      "quot": "\"",
      "lt"  : "<",
      "gt"  : ">"
  };
  return encodedString.replace(translate_re, function(match, entity) {
      return translate[entity];
  }).replace(/&#(\d+);/gi, function(match, numStr) {
      var num = parseInt(numStr, 10);
      return String.fromCharCode(num);
  });
}

function cleanResults(res) {
  res.forEach((e) => {
    e.question = decodeEntities(e.question);
  });
  return res;
}

function createGame(creatorid,userName) {
  axios.get(triviaAddress).then(res => {
    let cur = games.length;
    games[cur] = {questions:[],connections:[{ID:creatorid,Score:0,selectedAnswer:null,userName:userName}],started:false}; 
    games[cur].questions = cleanResults(res.data.results);
    io.to(creatorid).emit('joined',({gameID:cur}));
    updatePlayers(cur);
  });
}

function shuffle(array) {
  let currentIndex = array.length,  randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex != 0) {

    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}

function handleQuestions(questions,answer) {
  let result = [];
  questions.forEach((e) => {
    result.push(decodeEntities(e));
  })
  result.push(decodeEntities(answer));
  result = shuffle(result);
  return result;
}

function startGame(gameid) {

  const running = (iterations,gameID) => {
    let questions = games[gameID].questions;
    let current = questions[iterations];
    let currentAnswers = [];
    let correctAnswer = decodeEntities(current.correct_answer);
    //adds all answers
    current.incorrect_answers.forEach((cur) => {
      currentAnswers.push(cur);
    });
    currentAnswers=handleQuestions(current.incorrect_answers,correctAnswer);
    //needs to be randomized

    games[gameID].connections.forEach((i) =>{
      io.to(i.ID).emit('question',({category:current.category,
        type:current.type,
        difficulty:current.difficulty,
        question:current.question,
        answers:currentAnswers,
      }));
    })
      setTimeout(function() {checkAnswers(gameID,correctAnswer,iterations)},11000);
  }
  const checkAnswers = (gameid,correctAnswer,iterations) => {
    games[gameid].connections.forEach((e) => {
      if (e.selectedAnswer == correctAnswer) {
        e.Score+=10;
        io.to(e.ID).emit('score',({score:e.Score}));
      }
      io.to(e.ID).emit('correctAnswer',({answer:correctAnswer}));
    });
    updatePlayers(gameid);
    iterations++;

    if (iterations < 10) {
      console.log(iterations);
    setTimeout(function(){running(iterations,gameid)},3000);
    } else {
      setTimeout(function(){resetGame(gameid)},3000);
    }
  }
  running(0,gameid);
} 

function resetGame(gameid) {
  games[gameid].connections.forEach((e) => {
    io.to(e.ID).emit('gameOver');
  });
  games.splice(gameid,1);
  console.log(games);
}

function selectedAnswer(id,gameid,value) {
  let game = games[gameid];
  if (game != undefined) {
    game.connections.forEach((e) => {
      if (e.ID == id) {
        e.selectedAnswer = value;
      }
    });
  }
}


function joinGame(id,gameID,userName) {
  if (games[parseInt(gameID)] != undefined) {
    games[gameID].connections.push({ID:id,Score:0,selectedAnswer:null,userName:userName});
    if (!games[gameID].started) {
    io.to(id).emit('joined',({gameID:gameID}));
    updatePlayers(gameID);
    }
  } else {
    createGame(id,userName);
  }
}

function updatePlayers(gameID) {
  let userList = [];
  for(let i=0;i<games[gameID].connections.length;i++) {
    let cur = games[gameID].connections[i];
    userList.push({userName:cur.userName,score:cur.Score});
  }
  for(let i=0;i<games[gameID].connections.length;i++) {
    let cur = games[gameID].connections[i];
    io.to(cur.ID).emit('updatePlayers',({userList:userList}));
  }
}

io.on('connection', socket => {
  connectUser(socket.id);
  socket.on('createServer', (userName)=> {
    createGame(socket.id,userName);
  });
  socket.on('join', ({gameID,userName}) => {
    joinGame(socket.id,gameID,userName);
  });
  socket.on('selectedAnswer', (response) => {
    selectedAnswer(socket.id,response.gameID,response.value);
  });
  socket.on('disconnect', () => {
    console.log(socket.id + '  disconnecting');
    disconnectUser(socket.id);
  });
  socket.on('startGame', (gameID) => {
    startGame(gameID);
    games[gameID].started = true;
  })

})

http.listen(4000,function () {
  console.log('started on port 4000');
})