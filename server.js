require('dotenv').config();
const express = require('express');
require('./config/database');
const PORT = process.env.PORT;
const donorRouter = require('./routes/donorRouter')
const transactionRouter = require('./routes/transactionRouter')
const hospitalRoutes = require('./routes/hospitalRoutes')
const messageRoute = require('./routes/messageRoute')
const adminRoutes = require('./routes/adminRoutes');
const cors = require('cors');
const morgan = require('morgan');
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const fs = require('fs');
const path = require('path');


const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();

app.use(express.json());
app.use(cors({origin: '*'}));
app.use(morgan('dev'));


// Swagger Configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: { 


      title: "LifeLink Documentation",

      version: "1.0.0",
      description: "API for managing blood donors",
      license: {
        name: "base:https://lifelink-7pau.onrender.com/api/v1 \n https://alife-nine.vercel.app/api/v1",
      }
    },
    servers: [
      {
        url: "https://lifelink-7pau.onrender.com/api/v1",
        description: "Production Server 1",
      },
      {
        url: "https://alife-nine.vercel.app/api/v1",
        description: "Production Server 2",
      },
      {
        url: `http://localhost:${PORT}/api/v1`,
        description: "Development Server",
      },
    ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your token like: `Bearer <your_token>`"
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
},
  apis: ["./routes/*.js"], // Load API documentation from route files
};
