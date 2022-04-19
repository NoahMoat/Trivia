import React, {useState, useEffect} from 'react';
import "./app.css";
import {socketID, socket} from './socket';

function App() {
    //used just for teh form
  const [inGame, setInGame] = useState(false);
  const [gameID,setGameID] = useState();
  const [question, setQuestion] = useState({category:'', type:'',difficulty:'',question:'',answers:[]});
  const [selected,setSelected] = useState(null);
  const [score,SetScore] = useState(0);
  const [userList,setUserList] = useState([]);
  const [gameStarted,setGameStarted] = useState(false);
  const [thisUserName,setThisUserName] = useState();
  useEffect(() => {
    socket.on('question', ({category, type,difficulty,question,answers}) => {
      setGameStarted(true);
      setQuestion({category, type, difficulty,question,answers})
      setSelected(null);
      clearClassNamesFromButtons();
      document.getElementById('timer').classList.add('active');
    })
    socket.on('joined', ({gameID}) => {
      setInGame(true);
      setGameID(gameID);
    })
    socket.on('score',({score}) => {
      SetScore(score);
    });
    socket.on('gameOver', () => {
      clearClassNamesFromButtons();
      setInGame(false);
      setQuestion({category:'', type:'',difficulty:'',question:'',answers:[]});
    })
    socket.on('correctAnswer',({answer}) => {
      let parent = document.getElementsByClassName('answer-container')[0].children;
      for(let i = 0; i < parent.length; i++) {
        if (parent[i].innerText == answer) {
          parent[i].classList.add('correctAnswer');
        }
      }
      document.getElementById('timer').classList.remove('active');
    });
    socket.on('updatePlayers',({userList:playerList}) => {
      playerList.sort((a,b) => {
        return b.score - a.score;
      });
      setUserList(playerList);
    });
  },[])


  const handleClickedAnswer = (value,index) => () => {
    if(selected == null) {
    setSelected(index);
    socket.emit('selectedAnswer',({value,gameID}));
    document.getElementById('answer:'+index).classList.add('selected');
    }
  }

  function clearClassNamesFromButtons() {
    let parent = document.getElementsByClassName('answer-container')[0].children;
    for(let i = 0; i < parent.length; i++) {
      parent[i].classList.remove('correctAnswer');
      parent[i].classList.remove('selected');
    }
  }

  const renderQuestion = () => {
    if (question != undefined) {
    return(
    <div className="questions">
    <h1>
    {question.question}
    </h1>
    <div className='answer-container'>
      {question.answers.map((item,index) => 
      <button key={index} id={"answer:"+index} onClick={handleClickedAnswer(item,index)}>{item}</button>
      )}
    </div>
    </div>

    );
    }
  }

  const startGame = () => {
    socket.emit('startGame',(gameID));
    setGameStarted(true);
  }
  
  const onFormSubmit = (e) => {
    e.preventDefault();
    let formGameID = document.getElementById('FORM_GAME_ID').value;
    let userName = document.getElementById('FORM_USERNAME').value;
    setThisUserName(userName);
    socket.emit('join',({gameID:formGameID,userName:userName}));
  }

  return (
    <div className="App">
      <div>score: {score}</div>
      {inGame ? (<><h2>game code {gameID}</h2></>) : (<></>)}
        {!inGame ? (
          <form onSubmit={onFormSubmit}>
          <div>
            <input type="text" name="playerName" id="FORM_USERNAME" placeholder='username' value={thisUserName}/>
          </div>
          <div>
            <input type="text" name="gameID" placeholder='gamecode' id="FORM_GAME_ID"/>
          </div>
         <button>Join Game</button>
         </form>
        ) : (<>
        {!gameStarted ? (<div className='center'><button onClick={startGame}>start game</button></div>):(<><div id="timer" className='active'></div>{renderQuestion()}</>)
        }
        </>)}
        <div className='userList'>
        {userList.map((e) => {
            return <div>{e.userName} : {e.score}</div>
          })}
        </div>
    </div>
  );
}

export default App;
