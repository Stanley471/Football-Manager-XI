import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Football Manager XI API is running'
  });
});

import routes from './routes';
app.use('/api/v1', routes);

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

export default app;
