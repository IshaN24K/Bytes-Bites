import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import foodRouter from './routers/food.router.js';
import userRouter from './routers/user.router.js';
import orderRouter from './routers/order.router.js';
import uploadRouter from './routers/upload.router.js';
import { dbconnect } from './config/database.config.js';
import path, { dirname } from 'path';
import csv from 'csv-parser';
import fs from 'fs';

dotenv.config();
dbconnect();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors({ 
  credentials: true, 
  origin: ['https://bytes-bites-frontend.onrender.com', 'http://localhost:3000'] 
}));

// --- FIXED: Path points to backend/public instead of backend/src/public ---
const publicFolder = path.join(__dirname, '..', 'public');
app.use(express.static(publicFolder));

app.use('/api/foods', foodRouter);
app.use('/api/users', userRouter);
app.use('/api/orders', orderRouter);
app.use('/api/upload', uploadRouter);

app.get('/api/csv', (req, res) => {
  // --- FIXED: Path points to backend/src/Data/extract_data.csv ---
  const csvFilePath = path.join(__dirname, 'Data', 'extract_data.csv');
  if (fs.existsSync(csvFilePath)) {
    res.sendFile(csvFilePath);
  } else {
    res.status(404).send("CSV file not found");
  }
});

app.get('/api/data', (req, res) => {
  const userOrders = {};
  const foodPopularity = {};
  const csvFilePath = path.join(__dirname, 'Data', 'extract_data.csv');

  if (!fs.existsSync(csvFilePath)) {
    return res.status(404).json({ error: 'CSV file not found' });
  }

  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', (data) => {
      if (data.email) {
        const email = data.email;
        const quantity = parseFloat(data.quantity) || 0;
        const foodName = data.food_name;

        const calorieData = [
          { food: 'Pav Bhaji', calories: 290 }, { food: 'Misal Pav', calories: 289 },
          { food: 'Mini Lunch', calories: 293 }, { food: 'Idli Sambhar', calories: 304 },
          { food: 'Veg Biryani', calories: 241 }, { food: 'NonVeg Biryani', calories: 350 },
          { food: 'Noodles', calories: 210 }, { food: 'Puri Bhaji', calories: 310 },
          { food: 'Samosa', calories: 105 }, { food: 'VegSandwich', calories: 190 },
          { food: 'Vada Pav', calories: 197 }, { food: 'Coca Cola', calories: 140 },
          { food: 'Appy Fizz', calories: 52 }, { food: 'Buttermilk', calories: 98 },
          { food: 'AmulCool', calories: 104 }, { food: 'Tropicana', calories: 96 },
          { food: 'Pizza', calories: 310 }, { food: 'Sev Puri', calories: 171 },
          { food: 'Burger', calories: 220 },
        ];

        const foodCalories = calorieData.find(f => f.food === foodName)?.calories || 0;
        const totalCalories = foodCalories * quantity;

        if (!userOrders[email]) userOrders[email] = [];
        userOrders[email].push({ foodName, quantity, totalCalories });

        foodPopularity[foodName] = (foodPopularity[foodName] || 0) + quantity;
      }
    })
    .on('end', () => {
      const pieChartData = Object.keys(foodPopularity).map(name => ({
        label: name,
        value: foodPopularity[name],
      }));

      const sortedUserOrders = Object.entries(userOrders).map(([email, orders]) => ({
        email,
        orders: orders.sort((a, b) => a.foodName.localeCompare(b.foodName)),
        calorieCount: orders.reduce((acc, order) => acc + order.totalCalories, 0),
      }));

      res.json({ sortedUserOrders, pieChartData });
    })
    .on('error', (err) => {
      res.status(500).json({ error: 'Error reading CSV' });
    });
});

// --- FIXED: Catch-all route to serve the frontend index.html if it exists ---
app.get('*', (req, res) => {
  const indexFilePath = path.join(publicFolder, 'index.html');
  if (fs.existsSync(indexFilePath)) {
    res.sendFile(indexFilePath);
  } else {
    res.status(404).send("Frontend not built. Please use Port 3000 for development.");
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log('Server is running on port ' + PORT);
});