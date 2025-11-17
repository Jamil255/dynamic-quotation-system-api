import cookieParser from 'cookie-parser'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { testDatabaseConnection } from './config/prisma.js'
import { errorHandler, notFound } from './middlewares/error-handler.js'
import authRoutes from './routes/auth.js'
import invoiceRoutes from './routes/invoice.js'
const app = express()
const port = process.env.PORT || 3000

app.use(express.json())
app.use(helmet())
app.use(morgan('dev'))
app.use(cookieParser())

// app.get('/', (req, res) => res.send('API is running...'))

//routes
app.use('/api/auth', authRoutes)
app.use('/api/invoice', invoiceRoutes)

// Error handling
app.use(notFound)
app.use(errorHandler)

app.listen(port, async () => {
  console.log(`server is runing on port:${port}`)
  await testDatabaseConnection()
})
