import { Question, User, UserProfile } from "@prisma/client";

export class DbAnswer {
  id: string;
  userId: string;
  questionId: string;
  text: string;
  rate: number;
  isSolution: boolean;
  createdAt: Date;
  updatedAt: Date;
  question: Question;
  userProfile: UserProfile;
};