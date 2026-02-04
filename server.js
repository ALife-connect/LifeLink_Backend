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
const cron = require('node-cron');
const { deleteExpiredRecords } = require('./controller/adminController');


const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();

app.use(express.json({ limit: "10mb" })); 
app.use(express.urlencoded({ limit: "10mb", extended: true }));
const allowedOrigins = [
  "https://lifelink-2dak.onrender.com", 
  "https://alife-nine.vercel.app"   
];

app.use(
  cors({origin: "*",})
);

app.use(morgan('dev'));


// Swagger Configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: { 


      title: "Alife Documentation",

      version: "1.0.0",
      description: "API for managing blood donors",
      license: {
        name: " ALIFE",
      }
    },
    servers: [
      {
        url: "https://lifelink-2dak.onrender.com/api/v1",
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
  apis: ["./routes/*.js"], 
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs, { explorer: true}));

// Schedule task: every day at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('🕛 Running daily cleanup of expired records...');
  await deleteExpiredRecords();
});

// Use Routers    
app.get('/', (req, res)=>{
    res.send('Welcome to Alife')
})
app.use('/api/v1', donorRouter);
app.use('/api/v1', transactionRouter);
app.use('/api/v1', hospitalRoutes);
app.use('/api/v1', messageRoute);
app.use('/api/v1', adminRoutes);

deleteExpiredRecords();

app.listen(PORT, ()=>{
    console.log(`Server is listening to PORT: ${PORT}`);
    console.log(` Render: https://lifelink-2dak.onrender.com/api-docs`);
    console.log(` Vercel: https://alife-nine.vercel.app/api-docs`);
}); 
