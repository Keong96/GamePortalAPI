const express = require("express");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const cors = require('cors')
const app = express();
const PORT = process.env.PORT || 8081;
const crypto = require("crypto");
require('dotenv').config();

const config = {
  connectionString:
    "postgres://gameportal_db_user:TnJdfCS9gNV1j1P19fsGp2H14t6qkf1N@dpg-cjrcte61208c73bkhro0-a.singapore-postgres.render.com/gameportal_db?ssl=true",
};

const { Client } = require('pg');
const { constants } = require("buffer");
const client = new Client(config);
client.connect()

app.use(cors())
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: false, parameterLimit:50000 }));

app.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});

function GenerateJWT(_userId, _username, _user_type)
{
  return jwt.sign(
      { userId: _userId, username: _username, user_type: _user_type},
      process.env.TOKEN_KEY,
      { expiresIn: "24h" }
    );
}

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.TOKEN_KEY, (err, user) =>
    {
      if (err)
      {
        return res.sendStatus(403);
      }

      req.user = user;
      next();
    });
  }
  else
  {
    res.sendStatus(401);
  }
}


app.get('/', async (req, res) => {
  res.status(200).send("OK");
})

//USER Login + CRUD

app.post('/user/login', async (req, res) => {

  if( typeof(req.body.username) == 'undefined' || typeof(req.body.password) == 'undefined')
  {
    return res.status(500).send("Error: Please enter your username and password to login.");
  }

  client.query("SELECT * FROM users WHERE username = '"+req.body.username+"' AND password = crypt('"+req.body.password+"', password)")
        .then((result) => {
          if(result.rows.length > 0)
          {
            const token = GenerateJWT(result.rows[0].id, result.rows[0].username, result.rows[0].user_type);

            client.query("UPDATE users SET last_login = NOW() WHERE id = "+result.rows[0].id)

            res.status(200).json({
                success: true,
                data: {
                  userId: result.rows[0].id,
                  token: token,
                },
              });
          }
          else
          {
            res.status(500).send("Error: Wrong Username or Password");
          }
        })
        .catch((e) => {
          console.error(e.stack);
          res.status(500).send(e.stack);
        })
})

app.post('/user/create', async (req, res) => {

  if( typeof(req.body.username) == 'undefined' || typeof(req.body.password) == 'undefined')
  {
    return res.status(500).send("Error: Please fill in your username and password to complete the registration process.");
  }

  client.query("SELECT * FROM users WHERE username = '"+req.body.username+"'")
        .then((result) => {
            if(result.rows.length > 0)
            {
              if(req.body.username == result.rows[0].username)
                return res.status(500).send("Error: username has been taken");
            }
            else
            {
              client.query("INSERT INTO users (username, password) VALUES ('"+req.body.username+"', crypt('"+req.body.password+"', gen_salt('bf')))")
                    .then((result) => {
                      res.status(201).send("Register Success");
                    })
                    .catch((e) => {
                      console.error(e.stack);
                      res.status(500).send(e.stack);
                    })
            }
        })
        .catch((e) => {
          console.error(e.stack);
          res.status(500).send(e.stack);
        })
})

app.get('/user/get/:id', verifyToken, async (req, res) => {

    client.query("SELECT * FROM users WHERE id = "+req.params.id)
          .then((result) => {
                if(result.rowCount <= 0)
                    res.status(500).send("User doesnt exist");
                else
                    res.send(JSON.stringify(result.rows[0]))
          })
          .catch((e) => {
                console.error(e.stack);
                res.status(500).send(e.stack);
          })
  })