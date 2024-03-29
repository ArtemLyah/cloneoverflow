import express from "express";
import { QuestionController } from "../controllers/question.controller";
import { AuthAccess } from "../middlewares/authAccess";
import { validateRequest } from "../middlewares/validation";
import { QuestionCreateDTO, QuestionUpdateDTO } from '@clone-overflow/common';

const router = express.Router();
const controller = new QuestionController();

router.post('/create', AuthAccess(), validateRequest({ body: QuestionCreateDTO }), controller.create.bind(controller));
router.patch('/:questionId/update', AuthAccess(), validateRequest({ body: QuestionUpdateDTO }), controller.update.bind(controller));

export { router as question };