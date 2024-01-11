import express, {Express, Request, Response} from 'express';
import * as http from "http";
import cors from "cors"
import {Server, Socket} from "socket.io";
import * as crypto from "crypto";



const app: Express = express();
const port = process.env.PORT ?? 9000;

let rooms:string[] = []

app.use(express.json())

app.use(cors({
    origin:"*"
}))

const SERVER_ROOM_PREFIX:string = "emu-rtc-room-"



const server = http.createServer(app)
const io = new Server(server, {cors: {
        origin: "*",
        methods: ['GET', 'POST']
    }})

app.get('/', (req: Request, res: Response) => {
    res.send('Express + TypeScript Server');
});

const getRooms = () => {
    return Array.from(io.sockets.adapter.rooms.keys()).filter(e=>e.startsWith(SERVER_ROOM_PREFIX))
}

const getRoomPlayers = (roomId: string): string[] => {
    return Array.from(io.sockets.adapter.rooms.get(roomId) || [])
}

const offers: Map<string, string[]> = new Map<string, string[]>()

type User = {
    username: string
    socketId: string
}

const NAMES: string[] = [
    "Roxanne Graves",
    "Ria Bray",
    "Sidney Pugh",
    "Arman Stevens",
    "Ellis Mckay",
    "Cindy Baker",
    "Robert Diaz",
    "Romeo Gaines",
    "Adele Wise",
    "Jamil Rojas",
    "Logan Stone",
    "Amaya Scott",
    "Inaya Warner",
    "Alanna Porter",
    "Asma Olsen",
    "Franciszek Welch",
    "Cole Mccarty",
    "Georgina Dillon",
    "Ronnie Stevenson",
    "Olivier Vargas",
];

const users: Map<string, User> = new Map<string, User>()

const me = ({socket}:{socket:Socket}) => {
    const _user = users.get(socket.id)
    if(_user){
        return _user
    }
    const randomIndex = Math.floor(Math.random() * NAMES.length);
    const newUser:User = {socketId: socket.id, username: NAMES.at(randomIndex) || "Bob"}
    users.set(socket.id, newUser)
    return newUser
}

const roomJoin = ({socket, roomId}:{socket: Socket, roomId: string}) => {
    socket.rooms.forEach(value => {
        socket.leave(value)
        socket.emit("leaving_room")
    })
    const user = me({socket})
    socket.join(roomId)
    socket.emit("connection_to_room", roomId)
    socket.to(roomId).emit("room_players", getRoomPlayers(roomId))
    socket.to(roomId).emit("new_player", user)
}



io.on("connection", (socket) => {
    console.log("user is connected")

    socket.emit("me", me({socket}))
    socket.emit("rooms", getRooms())


    socket.on("create_room", () => {
        const newRoomId = SERVER_ROOM_PREFIX + String(crypto.randomUUID())
        console.log("New room created:", newRoomId)
        socket.join(newRoomId)
        roomJoin({socket, roomId: newRoomId})
        socket.broadcast.emit("rooms", getRooms())
    })

    socket.on("new_message", ({roomId, message}:{roomId:string, message: string}) => {
        socket.to(roomId).emit("new_message", {message, user: users.get(socket.id)})
    })

    socket.on("join_room", ({roomId}:{roomId:string}) => {
        roomJoin({socket, roomId})
    })

    socket.on("disconnect", ()=>{
        console.log("user is disconnected")
    })

    socket.on("offer", ({offer, user}:{offer:string, user:User}) => {
        console.log("OFFER", JSON.stringify(offer).slice(0, 20), user.socketId)
        // socket.to(playerId).emit("offer", offer)
        const player = io.sockets.sockets.get(user.socketId);
        player?.emit("offer", {offer, user: users.get(socket.id)})
    })

    socket.on("answer", ({answer, user}:{answer:string, user:User}) => {
        const player = io.sockets.sockets.get(user.socketId);
        player?.emit("answer", {answer: answer, user: users.get(socket.id)})
        // socket.to(roomId).emit("answer", {answer: answer, playerId: socket.id})
    })

})


server.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
