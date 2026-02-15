import axios from 'axios';

axios.defaults.baseURL = process.env.NODE_ENV === 'production' 
  ? 'https://bytes-bites-backend.onrender.com' 
  : 'http://localhost:5001';