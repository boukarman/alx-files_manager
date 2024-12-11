import { Router } from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';
import FileController from '../controllers/FilesController';
import authMid from '../utils/authMid';
import authToken from '../utils/authToken';
import authTokenGet from '../utils/authTokenGet';

const router = Router();

router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);
router.post('/users', UsersController.postNew);
router.get('/connect', authMid, AuthController.getConnect);
router.get('/disconnect', authToken, AuthController.getDisconnect);
router.get('/users/me', authToken, AuthController.getMe);
router.post('/files', authToken, FileController.postUpload);
router.get('/files', authToken, FileController.getIndex);
router.get('/files/:id', authToken, FileController.getShow);
router.put('/files/:id/publish', authToken, FileController.putPublish);
router.put('/files/:id/unpublish', authToken, FileController.putUnpublish);
router.get('/files/:id/data', authTokenGet, FileController.getFile);

module.exports = router;
