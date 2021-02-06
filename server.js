const { default: Axios } = require("axios");
const express = require('express');
const cors = require("cors");
const { region } = require("./valorant.js");

Array.prototype.clean = function(deleteValue) {
  for (var i = 0; i < this.length; i++) {
    if (this[i] == deleteValue) {         
      this.splice(i, 1);
      i--;
    }
  }
  return this;
};

const retrieveCompData = async (history)=> {
  obj = await getRank();

  let out = calcContentV2(history);

  out["rankText"] = obj.Ranks[out["rankNumber"]];
  return out;
}

const calcContentV2 = (history)=>{
  let points = []
  let count = 0;
  let i = 0;
  let currRP = -100;
  let rankNumber = -1;
  
  for (; i<history.length; ++i)
  {   
      const game = history[i];
      if (game["TierAfterUpdate"] != "0")
      {
          let before = game["RankedRatingBeforeUpdate"];
          let after = game["RankedRatingAfterUpdate"];
          let afterRankNumber = game["TierAfterUpdate"];
          let beforeRankNumber = game["TierBeforeUpdate"];
          let differ = calcNetELO(afterRankNumber, after) - calcNetELO(beforeRankNumber, before);
          points[i] = {diff: differ, timestamp: game["MatchStartTime"]};
          count++;
          if(currRP==-100){
            currRP=game["RankedRatingAfterUpdate"];
            rankNumber=game["TierAfterUpdate"];
          }
      }

      if (count >= 5) // 5 recent matches found
          break;
  }

  points.clean(undefined);
  const data = {
    delta: points,
    currRP,
    rankNumber,
    net: calcNetELO(rankNumber, currRP)
  };
  return data;
}

const calcNetELO = (rankNumber, currRP) => {
  return ((rankNumber * 100) - 300 + currRP);
}

// const calcContent = (history)=>{
//   let points = []
//   let count = 0;
//   let i = 0;
//   let currRP = -100;
//   let rankNumber = -1;
  
//   for (; i<history.length; ++i)
//   {   
//       const game = history[i];
//       if (game["CompetitiveMovement"] == "MOVEMENT_UNKNOWN")
//       {
//           // not a ranked game
//       }
//       else if (game["CompetitiveMovement"] == "PROMOTED")
//       {
//           // player promoted
//           let before = game["TierProgressBeforeUpdate"];
//           let after = game["TierProgressAfterUpdate"];
//           let differ = (after - before) + 100; // positive num
//           points[i] = {diff: differ, timestamp: game["MatchStartTime"]};
//           count++;

//           if(currRP==-100){currRP=game["TierProgressAfterUpdate"];rankNumber=game["TierAfterUpdate"]}
//       }
//       else if (game["CompetitiveMovement"] == "DEMOTED")
//       {
//           // player demoted
//           let before = game["TierProgressBeforeUpdate"];
//           let after = game["TierProgressAfterUpdate"];
//           let differ = (after - before) - 100; // negative num
//           points[i] = {diff: differ, timestamp:game["MatchStartTime"]};
//           count++;

//           if(currRP==-100){currRP=game["TierProgressAfterUpdate"];rankNumber=game["TierAfterUpdate"]}
//       }
//       else
//       {
//           let before = game["TierProgressBeforeUpdate"];
//           let after = game["TierProgressAfterUpdate"];
//           let differ = after-before;
//           points[i] = {diff: differ, timestamp: game["MatchStartTime"]};
//           count++;

//           if(currRP==-100){currRP=game["TierProgressAfterUpdate"];rankNumber=game["TierAfterUpdate"]}
//       }

//       if (count >= 5) // 5 recent matches found
//           break;
//   }

//   points.clean(undefined);
  
//   const data = {
//     delta: points,
//     currRP,
//     rankNumber,
//     net: (rankNumber * 100) - 300 + currRP
//   };
//   return data;
// }

const getRank = async()=>{
  let obj = {
    "Ranks": {
      "0": "Unrated",
      "1": "Unknown 1",
      "2": "Unknown 2",
      "3": "Iron 1",
      "4": "Iron 2",
      "5": "Iron 3",
      "6": "Bronze 1",
      "7": "Bronze 2",
      "8": "Bronze 3",
      "9": "Silver 1",
      "10": "Silver 2",
      "11": "Silver 3",
      "12": "Gold 1",
      "13": "Gold 2",
      "14": "Gold 3",
      "15": "Platinum 1",
      "16": "Platinum 2",
      "17": "Platinum 3",
      "18": "Diamond 1",
      "19": "Diamond 2",
      "20": "Diamond 3",
      "21": "Immortal 1",
      "22": "Immortal 2",
      "23": "Immortal 3",
      "24": "Radiant"
    }
  }

  return obj;
}

const controller = async (req,res) => {

  const Valorant = require("./valorant.js");

  const regionMap = {
    ap: Valorant.region.ap,
    na: Valorant.region.na,
    eu: Valorant.region.eu
  }
  
  try {
  
    const client = new Valorant.Client({
      username: req.body.user, // your username
      password: req.body.pass, // your password
      region: regionMap[req.body.region], // Available regions: eu, na, ap
      debug: false // wether you want more console output or not
    });
    
    const accountData = await client.login();
    
    const comphistory = await client.getCompetitiveHistory(0,20);
    
    const compData = await retrieveCompData(comphistory.Matches);

    res.json({success:true, accountData, compData});
    
  } catch(err) {
    res.json({success: false, err: err.message})
  };
  
}

const app = express();
const port = process.env.PORT||3000;

app.use(express.json());
app.use(cors());

app.post('/get-data', controller)
app.get('/', (req,res)=>{
  res.send("ALIVE");
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`)
})