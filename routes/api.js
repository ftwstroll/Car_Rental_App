'use strict';

const mongodb = require('mongodb');
const mongoose = require('mongoose');



module.exports = function(app) {

  function getPrice(num){
      return (num/100).toFixed(2);
  }
  
  function setPrice(num){
      console.log(num)
      console.log((num*100))
      return parseInt(num*100);
  }
  
  const CONNECTION_STRING = process.env['MONGO_URI'];

  mongoose.connect(CONNECTION_STRING, { useNewUrlParser: true });

  let rentalSchema = new mongoose.Schema({
    client: { type: String, required: true },
    orderDate: { type: Date, required: true},
    startDAte: { type: Date, required: true },
    returnDate: { type: Date, required: true },
    orderAmount: { type: Number, get: getPrice, set: setPrice },
    balance: { type: Number, get: getPrice, set: setPrice },
  });
  
  let vehicleSchema = new mongoose.Schema({
    vin: { type: String, required: true, unique: true },
    vehicle: { type: String, required: true },
    type: { type: String, required: true },
    category: { type: String, required: true },
    year: {type: Number, required: true},
    rentals: [rentalSchema]
  });

  let clientSchema = new mongoose.Schema({
    name: {type : String, required: true},
    phone: {type : String, required: true, unique: true}
  })

  let rental = mongoose.model('rental',rentalSchema);
  let client = mongoose.model('client', clientSchema);
  let vehicle = mongoose.model('vehicle', vehicleSchema);

  //*
  // cust_add
  app.route('/api/cust_add')
    .post(function(req, res) {

      

      let newClient = new client({
        name: req.body.name,
        phone: req.body.phone
      });


      //checking if the phone number already exists in order for a more specific error message
      client.findOne({ phone: req.body.phone }, 
                     (err, found) =>{
                       if(!found){
                        //could just do this query and give a generic error  
                        newClient.save((error, newclient) => {
                          if (!error && newclient) {
                            return res.send("New client added");
                          } else {
                            return res.send('error');
                          }
                        });
                         
                       } else {
                         return res.send('Phone number already exists');
                       }
                       if(err){ return res.send("error");}
                     });

      



    })






  //
  // rental_add
  app.route('/api/rental_add')
    .get(function(req, res) {  // Get available vehicles

      const { startDate, returnDate, type, category } = req.query;
 
      let rates = {Compact: 40,
                  Medium: 50,
                  Large: 60,
                  SUV: 70,
                  Truck: 80,
                  Van: 90};
      
      let date = new Date().toUTCString();
      let sDate = new Date(startDate);
      let rDate = new Date(returnDate);
      let days = (  rDate.getTime()  -  sDate.getTime()  ) / (1000 * 3600 * 24);

      let cost = category == "Luxury" ? rates[type] * days * 1.25 : rates[type] * days;
      


      vehicle.find({},
                  (error, vehicles) => {
                  if (!error && vehicles) {

                    let available = [];
                    let test = true;
                    
                    vehicles.forEach( (vin) => {
                      if ( vin.type == type && vin.category == category){
                        vin.rentals.every( record => {
                          //test for available any rentals that conflict.
                          if (!( (new Date(record.startDate) < sDate) && ( new Date(record.returnDate) < sDate ) || ( new Date(record.startDate) > rDate) ) ){
                            test = false; //if one conflicts then test is set to false
                            return false;
                          }
                          return true;
                        });
                      } else {
                        test = false;
                      }

                      if ( test ){ // test is true if no conflicts are found, add vin to available vehicles
                        available.push([vin.vin, vin.vehicle])
                      } 
                      test = true;
                    })

                    
                    return res.json({vehicles: available, startDate, returnDate, cost});
                  } else {
                    return res.send('invalid id');
                  }
        });



    })
  .put((req, res) => { //put in the rental info for the selected vehicle

       const { vehicleId, phone, startDate, returnDate, cost } = req.body;

      
         //checking if the phone number already exists in order for a more specific error message
      client.findOne({ phone: phone }, 
                     (err, found) =>{
                       if(!err && found){
                        //could just do this query and give a generic error  

                         //create new rental record
                         let newRental = new rental({
                              client: phone,
                              orderDate: new Date().toUTCString() ,
                              startDAte: new Date(startDate).toUTCString(),
                              returnDate: new Date(returnDate).toUTCString(),
                              orderAmount: cost,
                              balance: cost  
                         });

                         //add record to the vehicle rental list
                        vehicle.findOneAndUpdate(
                          {vin: vehicleId},
                          {$push: {rentals: newRental} },
                          {new: true},
                          (error, vehicleAdd) => {
                          if (!error && vehicleAdd) {
                            return res.send("New rental added")
                          } else {
                            return res.send('Invalid vin')
                          }
                        });
                         
                       } else {
                         return res.send('Invalid phone number')
                       }
                     });
    
  });


     //
  // rental_return **in development
  app.route('/api/rental_return')
    .post(function(req, res) {

    })

    //
  // search
  app.route('/api/search')
    .get(function(req, res) {

      
      let cust = false;
      let search =  { };
      //console.log(req.query);

      if (req.query.name !== undefined){
        search['name'] =  { "$regex": req.query.name, "$options": "i" } ;
        cust = true;
      }

      if (req.query.phone !== undefined){
        search['phone'] =  { "$regex": req.query.phone, "$options": "i" } ;
        cust = true;
      }

      if (req.query.vin !== undefined){
        search['vin'] =  { "$regex": req.query.vin, "$options": "i" } ;
      }

      if (req.query.description !== undefined){
        search['vehicle'] =  { "$regex": req.query.description, "$options": "i" }; 
      }
      //console.log(search);
      if (cust){
        //console.log(search);
        client.find(search, 
                   (err, clients) => {
                     if(!err && clients) {
                      //console.log(clients);
                      let results = [];
                      
                       clients.forEach( (entry) => {
                        results.push([entry.name, entry.phone]);
                      });
                       
                      return res.json({found : results});
                       
                     } 
                      else {
                        console.log("else");
                      }



                   })


        
      } else {

        //console.log(search);
        vehicle.find(search, 
                   (err, vehicles) => {
                     if(!err && vehicles) {
                       let results = [];
                       vehicles.forEach ( (entry) => {
                        results.push([entry.vin, 
                                      entry.vehicle,
                                      entry.category,
                                      entry.year]);
                         
                       })

                      return res.json({found : results});
                       
                     } 




                   })

        
      }
  
    })


    //
  // vehicle_add
  app.route('/api/vehicle_add')
    .post(function(req, res) {

      const { vehicleID, description, year, type, category } = req.body;



      //checking if the vin already exists in order for a more specific error message
      vehicle.findOne({ vin: vehicleID }, 
                     (err, found) =>{
                       if(!found){
                        //could just do this query and give a generic error
               
                        let newVehicle = new vehicle({
                          vin: vehicleID,
                          vehicle: description,
                          type: type,
                          category: category,
                          year: year
                        });

                         
                        newVehicle.save((error, newVeh) => {
                          if (!error && newVeh) {
                            return res.send("New vehicle added")
                          } else {
                            console.log(error)
                            return res.send('error')
                          }
                        });
                         
                       } else {
                         return res.send('Vin already exists')
                       }
                     });



    })
}