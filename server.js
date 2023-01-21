let express = require('express');
let app = express();
let bodyParser = require('body-parser');
let mysql = require('mysql');
const cors = require('cors');
let mysqlconnection = mysql.createPool({
  host: '203.150.94.158',
  user: 'intelligist',
  password: 'rklg;biNf8iy[',
  database: 'test'
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(cors({ origin: 'http://localhost:8080' }));
app.use(cors({ origin: '*' }));

// homepage route
app.get('/', (req, res) => {
  return res.send({
    message: 'Welcome to RESTful CRUD API with NodeJS, Express',
  })
})

//Get movie List
app.get('/GetmovieList', (req, res) => {
  let today = new Date();
  let todayFormatted = today.toISOString().slice(0, 10);
  mysqlconnection.getConnection(function (err, connection) {
    if (err) {
      console.error(err);
      return res.sendStatus(500);
    }
    connection.query(`SELECT cinema.* , Images.cinema_image FROM cinema LEFT JOIN Images ON cinema.cinema_image_id = Images.cinema_image_id`, function (error, results) {
      connection.release();
      if (error) {
        console.error(error);
        return res.sendStatus(500);
      }
      let message = "";
      if (results.length === 0) {
        message = "No cinema found";
      } else {
        message = "Successfully retrieved all cinema with images";
      }
      return res.send({ message: message, date: todayFormatted, data: results });
    });
  });
});

app.post('/Getmoviedetil', (req, res) => {
  let cinema_name = req.body.cinema_name;
  let today = new Date();
  let todayFormatted = today.toISOString().slice(0, 10);
  mysqlconnection.getConnection(function (err, connection) {
    if (err) {
      console.error(err);
      return res.sendStatus(500);
    }
    connection.query(`SELECT cinema_id FROM cinema WHERE cinema_name = ?`, [cinema_name], function (error, results) {
      if (error) {
        console.error(error);
        return res.status(500).send({ message: "Internal Server Error" });
      }
      if (results.length === 0) {
        return res.status(404).send({ message: "Cinema not found" });
      }
      let cinema_id = results[0].cinema_id;

    connection.query(`SELECT cinema.cinema_name, cinema.cinema_description, cinema.cinema_type, cinema.cinema_time, Images.cinema_image 
    FROM cinema LEFT JOIN Images ON cinema.cinema_image_id = Images.cinema_image_id WHERE cinema_id = ? `, [cinema_id] , function (error, results) {
      connection.release();
      if (error) {
        console.error(error);
        return res.sendStatus(500);
      }
      let message = "";
      if (results.length === 0) {
        message = "No cinema found";
      } else {
        message = "Successfully retrieved all cinema with images";
      }
      return res.send({ message: message, date: todayFormatted, data: results });
    });
  });
  });
});

//Booking ticket
app.post('/bookticket', (req, res) => {
  let cinema_name = req.body.cinema_name;
  let seat_zone = req.body.seat_zone;
  let seat_number = req.body.seat_number;
  let booking_date = req.body.booking_date;
  let booking_round = req.body.booking_round;
  let today = new Date();

  mysqlconnection.getConnection(function (err, connection) {
    if (err) {
      console.error(err);
      return res.status(500).send({ message: "Internal Server Error" });
    }
    connection.query(`SELECT cinema_id FROM cinema WHERE cinema_name = ?`, [cinema_name], function (error, results) {
      if (error) {
        console.error(error);
        return res.status(500).send({ message: "Internal Server Error" });
      }
      if (results.length === 0) {
        return res.status(404).send({ message: "Cinema not found" });
      }
      let cinema_id = results[0].cinema_id;
      connection.query(`SELECT Seats_Status FROM Seatstatus WHERE cinema_id = ? AND Seats_zone = ? AND Seats_position = ?`, [cinema_id, seat_zone, seat_number], function (error, results) {
        if (error) {
          console.error(error);
          return res.status(500).send({ message: "Internal Server Error" });
        }
        if (results[0].Seats_Status === 'unavailable') {
          return res.status(400).send({ message: "The seat is not available" });
        } else {
          connection.query(`INSERT INTO booking (cinema_id, seat_zone, seat_number,booking_date, booking_round, Booking_Status, Date_and_time_of_booking) VALUES (?,?,?,?,?,?,?)`, [cinema_id, seat_zone, seat_number, booking_date, booking_round, "reserve", today], function (error, results) {
            if (error) {
              console.error(error);
              return res.status(500).send({ message: "Internal Server Error" });
            }
            connection.query(`UPDATE Seatstatus SET Seats_Status = "unavailable" WHERE cinema_id = ? AND Seats_zone = ? AND Seats_position = ?`, [cinema_id, seat_zone, seat_number], function (error, results) {
              connection.release();
              if (error) {
                console.error(error);
                return res.status(500).send({ message: "Internal Server Error" });
              }
              return res.status(201).send({ message: "Ticket booked successfully" });
            });
          });
        }
      });
    });
  });
});

//Cancel booking
app.post('/cancelbooking', (req, res) => {
  let booking_id = req.body.booking_id;

  mysqlconnection.getConnection(function (err, connection) {
    if (err) {
      console.error(err);
      return res.status(500).send({ message: "Internal Server Error" });
    }
    connection.query(`SELECT * FROM booking WHERE booking_id = ?`, [booking_id], function (error, results) {
      if (error) {
        console.error(error);
        return res.status(500).send({ message: "Internal Server Error" });
      }
      if (results.length === 0) {
        return res.status(404).send({ message: "Booking not found" });
      }
      let cinema_id = results[0].cinema_id;
      let seat_zone = results[0].seat_zone;
      let seat_number = results[0].seat_number;

      connection.query(`DELETE FROM booking WHERE booking_id = ?`, [booking_id], function (error, results) {
        if (error) {
          console.error(error);
          return res.status(500).send({ message: "Internal Server Error" });
        }
        connection.query(`UPDATE Seatstatus SET Seats_Status = "available" WHERE cinema_id = ? AND Seats_zone = ? AND Seats_position = ?`, [cinema_id, seat_zone, seat_number], function (error, results) {
          connection.release();
          if (error) {
            console.error(error);
            return res.status(500).send({ message: "Internal Server Error" });
          }
          return res.status(200).send({ message: "Booking canceled successfully" });
        });
      });
    });
  });
});

// Show available seat.
app.post('/availableseats', (req, res) => {
  let cinema_name = req.body.cinema_name;
  let Showtime = req.body.Showtime;
  let Theatre_name = req.body.Theatre_name;
  mysqlconnection.getConnection(function (err, connection) {
    if (err) {
      console.error(err);
      return res.status(500).send({ message: "Internal Server Error1" });
    }
    connection.query(`SELECT cinema_id, cinema_name FROM cinema WHERE cinema_name = ?`, [cinema_name], function (error, results) {
      if (error) {
        console.error(error);
        return res.status(500).send({ message: "Internal Server Error" });
      }
      if (results.length === 0) {
        return res.status(404).send({ message: "Cinema not found" });
      }
      let cinema_id = results[0].cinema_id;
      connection.query(`SELECT Theatre_id, Theatre_name FROM Theatre WHERE Theatre_name = ?`, [Theatre_name], function (error, results) {
        if (error) {
          console.error(error);
          return res.status(500).send({ message: "Internal Server Error" });
        }
        if (results.length === 0) {
          return res.status(404).send({ message: "Theatre_name not found" });
        }
        let Theatre_id = results[0].Theatre_id;
        connection.query(`SELECT Showtime , cinema_id , Theatre_id FROM Showtime WHERE cinema_id = ? AND Showtime = ? AND Theatre_id = ?`, [cinema_id, Showtime, Theatre_id], function (error, results) {
          if (error) {
            console.error(error);
            return res.status(500).send({ message: "Internal Server Error" });
          }
          if (results.length === 0) {
            return res.status(404).send({ message: "Cinema not found" });
          }
          let Showtime = results[0];
          connection.query(`SELECT cinema.cinema_name AS Cinema, Showtime.Showtime AS Time, Theatre.Theatre_name AS Theatre, Seatstatus.Seats_zone AS Zone, Seatstatus.Seats_position AS Position, Seatstatus.Seats_Status AS Status 
          FROM Showtime  LEFT JOIN Theatre ON Theatre.Theatre_id = Showtime.Theatre_id LEFT JOIN cinema ON cinema.cinema_id = Showtime.cinema_id  LEFT JOIN Seatstatus ON Seatstatus.Theatre_id = Showtime.Theatre_id 
          WHERE cinema.cinema_id = ?   AND Showtime.Showtime = ?  AND Theatre.Theatre_id = ?  AND Seatstatus.Seats_Status = 'available'`, [Showtime.cinema_id, Showtime.Showtime, Showtime.Theatre_id,], function (error, results) {
            connection.release();
            if (error) {
              console.error(error);
              return res.sendStatus(500).send({ message: "Internal Server Error" });
            }
            if (results.length === 0) {
              message = "No cinema found";
            } else {
              message = "Successfully retrieved all cinema with images";
            }
            return res.send({ message: message, data: results });
          });
        });
      });
    });
  });
});

app.listen(3000, () => {
  console.log('Node App is running on port 3000');
})
module.exports = app;