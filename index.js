const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors");

const app = express();

const corsOptions = {
  origin: process.env.CORS_URLS || ["https://28dbc6cc-7430-48dd-9913-90c3edb98fea-00-28l8kzbxvcs6z.pike.replit.dev","http://localhost:5500","*","http://127.0.0.1:5500"],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CORS_URLS || ["https://28dbc6cc-7430-48dd-9913-90c3edb98fea-00-28l8kzbxvcs6z.pike.replit.dev","http://localhost:5500","*","http://127.0.0.1:5500"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

function remove(arr, elementToRemove) {
  const indexToRemove = arr.indexOf(elementToRemove);

  if (indexToRemove !== -1) {
    arr.splice(indexToRemove, 1);
    console.log(`Removed element ${elementToRemove} from the array:`, arr);
  } else {
    console.log(`Element ${elementToRemove} not found in the array.`);
  }
}

function debugLog(message) {
  console.log('\x1b[31m%s\x1b[0m',`[DEBUG] ${message}`);
}

const socketRooms = {};
const allRooms = [];
const availableRoomsToJoin = [];
const fullRooms = [];

io.on("connection", (socket) => {

  socket.on("checkAvailableRooms",()=>{
    socket.emit("availableRooms",availableRoomsToJoin);
    debugLog(`Sent a list of Availabe Rooms to ${socket.id}`);
  });



  
  // Handle joining a room
  socket.on("joinRoom", (room) => {
    
    debugLog(`User trying to join room: ${room}`);
    
    console.log(allRooms)

    if (allRooms.includes(room)){
      
      debugLog(`User room ${room} found in allRooms!`)
      
      if (fullRooms.includes(room)){
        io.to(socket.id).emit("roomFull", room);
        debugLog(`User room ${room} is already full and socket event roomFull is emitted!`)
        console.log("Room is already full");

        
        
      } else if(availableRoomsToJoin.includes(room)){
        debugLog(`User room ${room} found in availabe rooms and now after joining of this user the room has been full!`)
        remove(availableRoomsToJoin, room);
        console.log('\x1b[31m%s\x1b[0m',`Room ${room} is full now!`)
        fullRooms.push(room)
        console.log("Available Rooms: ",availableRoomsToJoin)
        
        socket.join(room);
        socket.to(room).emit("userJoined", socket.id);
        // io.to(socket.id).emit("lastConnected");
        io.to(room).emit("lastConnected");


        // io.to(room).emit("startSharingSDPandICE")
        socketRooms[socket.id] = socketRooms[socket.id] || new Set();
        socketRooms[socket.id].add(room);

        socket.on("messageFromClient",(msg)=>{
          socket.to(room).emit("message", [socket.id,msg]);
          debugLog(`Message from ${socket.id} to ${room} is ${msg}`)
        });

        socket.on('sendSDP', (room, sdp) => {
          // Broadcast the SDP to all clients in the specified room
          console.log("Recieved SDP")
          socket.to(room).emit('receivedSDP', { from: socket.id, sdp: sdp });
        });

        socket.on('sendICE', (room, iceCandidate) => {
          console.log("Recieved ICE")

          // Broadcast the ICE candidate to all clients in the specified room
          socket.to(room).emit('receivedICE', { from: socket.id, iceCandidate: iceCandidate });
        });

        // socket.on("dataExchangedTimeToInit",()=>{
        //   socket.to(room).emit("initiateCall")
        // })
        
      }
      
    } else {
      allRooms.push(room);
      availableRoomsToJoin.push(room);
      console.log(`Room ${room} is now available to join!`)  
      debugLog(`User room ${room} has been created and 1 member is there and userJoined event is emitted!`)

      console.log(allRooms)
      
      socket.join(room);
      socket.to(room).emit("userJoined", socket.id);
      socketRooms[socket.id] = socketRooms[socket.id] || new Set();
      socketRooms[socket.id].add(room);

      socket.on("messageFromClient",(msg)=>{
        socket.to(room).emit("message", [socket.id,msg]);
        debugLog(`Message from ${socket.id} to ${room} is ${msg}`)
      });

    }

    // socket.join(room);
    // console.log(`Socket ${socket.id} joined room ${room}`);
    console.log("\nAvailabe rooms to join: ",availableRoomsToJoin);
    console.log("\nFull rooms: ",fullRooms);

  
    



    socket.on("disconnect", async () => {
      // Get the list of rooms for the user
      const rooms = socketRooms[socket.id] || new Set();

      // Notify each room that a user has disconnected
      rooms.forEach((room) => {
        io.to(room).emit("userDisconnected", socket.id);

        if (fullRooms.includes(room)){
          remove(fullRooms, room)
          availableRoomsToJoin.push(room)
          console.log(`Room ${room} is now available to join!`)
          console.log(fullRooms)
        } else if(availableRoomsToJoin.includes(room)){
          remove(availableRoomsToJoin, room)
          remove(allRooms, room)

          console.log(`Room ${room} is deleted!`)
          console.log(availableRoomsToJoin)
        }

        // Remove user information from Firebase RTDB

      });

      // Remove the user from the list
      delete socketRooms[socket.id];

      // Handle cleanup if needed
      console.log(`Socket ${socket.id} disconnected`);
    });

    // console.log(socketRooms)

    // Notify the room that a new user has joined
  });

  socket.on("lastUserConnected",(room)=>{
    socket.to(room).emit("startSharingSDPandICE")
  })

  // Handle signaling messages
  // socket.on("message", (message, room) => {
  //   // Broadcast the message to all clients in the room
  //   io.to(room).emit("message", message);
  // });

  // Handle the connection close

});





// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
