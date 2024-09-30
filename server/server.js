// server.js
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
    },
});

app.use(cors());
app.use(express.json());

const uri = "mongodb+srv://yuvraj:yuvraj123@practice.ypsug.mongodb.net/?retryWrites=true&w=majority&appName=Practice";

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('MongoDB connected');
    })
    .catch(err => console.error('MongoDB connection error:', err));

    
const bidSchema = new mongoose.Schema({
    productId: String,
    amount: Number,
    createdAt: { type: Date, default: Date.now }
});

const Bid = mongoose.model('Bid', bidSchema);

// Endpoint to fetch the highest bid for a specific product
app.get('/api/highestBid/:productId', async (req, res) => {
    try {
        const productId = req.params.productId;
        const highestBid = await Bid.findOne({ productId }).sort({ amount: -1 });
        console.log('Highest bid fetched:', highestBid);
        res.json(highestBid);
    } catch (error) {
        console.error('Error fetching highest bid:', error);
        res.status(500).json({ error: 'Error fetching highest bid' });
    }
});

// Handle socket connection
io.on('connection', (socket) => {
    console.log('New client connected');

    // Send the current highest bid when a new client connects
    socket.on('getHighestBid', async (productId) => {
        try {
            const highestBid = await Bid.findOne({ productId }).sort({ amount: -1 });
            console.log('Sending highest bid to client:', highestBid);
            socket.emit('highestBid', highestBid);
        } catch (error) {
            console.error('Error fetching highest bid for client:', error);
        }
    });

    // Listen for 'placeBid' events from clients
    socket.on('placeBid', async (bid) => {
        try {
            console.log('Received bid:', bid);
            const newBid = new Bid(bid);
            await newBid.save();

            // Fetch the highest bid after saving the new bid
            const highestBid = await Bid.findOne({ productId: bid.productId }).sort({ amount: -1 });
            console.log('New highest bid:', highestBid);

            // Emit the highest bid to all connected clients
            io.emit('highestBid', highestBid);
        } catch (error) {
            console.error('Error saving bid:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
