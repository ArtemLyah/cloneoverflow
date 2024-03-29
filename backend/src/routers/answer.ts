import express from 'express';
import { AnswerController } from '../controllers/answer.controller';
import { AuthAccess } from '../middlewares/authAccess';
import { validateRequest } from '../middlewares/validation';
import { AnswerCreateDTO, AnswerUpdateDTO } from '@clone-overflow/common';

const router = express.Router();
const controller = new AnswerController();

router.post('/create', AuthAccess(), validateRequest({
  body: AnswerCreateDTO,
}), controller.create.bind(controller));

router.patch('/:answerId/update', AuthAccess(), validateRequest({
  body: AnswerUpdateDTO,
}), controller.update.bind(controller));

export { router as answer };