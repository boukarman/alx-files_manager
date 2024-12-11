import express from 'express';

const port = process.env.PORT || 5000;
const app = express();
app.use(express.urlencoded());
app.use(express.json());

app.use('/', require('./routes/index'));

app.listen(port, () => console.log(`Server started on port ${port}`));
