import {
  AuthLoginDTO,
  BadBodyException,
  ForbiddenException,
  NoEntityWithIdException,
  OrderBy,
  UserGASortBy,
  UserGQSortBy,
  UserGetAnswersDTO,
  UserGetQuestionsDTO,
  UserUpdateDTO
} from '@cloneoverflow/common';
import { Prisma, UserAnswerStatus, UserQuestionStatus } from '@prisma/client';
import { AnswerRepository } from '../repositories/answer.repository';
import { QuestionRepository } from '../repositories/question.repository';
import { UserRepository } from "../repositories/user.repository";
import { DbAnswer, DbAnswerWithQuestion } from '../types/database/DbAnswer';
import { DbQuestion } from '../types/database/DbQuestion';
import { DbUserGetProfile } from '../types/database/DbUser';
import { DbUtils } from '../utils/DatabaseUtils';
import { compare } from '../utils/hash';
import { TokenPayload } from '../types/TokenPayload';

export class UserService {
  constructor(
    private userRepository = new UserRepository(),
    private answerRepository = new AnswerRepository(),
    private questionRepository = new QuestionRepository(),
  ) {}

  async get(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NoEntityWithIdException('User');
    }
    return user;
  }

  async update(userId: string, {name, username, about}: UserUpdateDTO) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NoEntityWithIdException('User');
    }

    if (username) {
      const userExists = await this.userRepository.find({
        userProfile: {
          username,
        }
      })
      if (userExists && userExists.id !== userId) {
        throw new BadBodyException("Username already exists");
      }
    }

    return await this.userRepository.updateById(userId, {
      userProfile: {
        update: {
          name,
          username,
          about,
        }
      }
    });
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findById<DbUserGetProfile>(userId, {
      include: {
        userProfile: {
          include: {
            _count: {
              select: {
                userAnswers: {
                  where: {
                    status: UserAnswerStatus.OWNER,
                  },
                },
                userQuestions: {
                  where: {
                    status: UserQuestionStatus.OWNER,
                  },
                },
              },
            },
            userAnswers: {
              take: 1,
              include: {
                answer: {
                  include: {
                    question: true,
                  },
                },
              },
              orderBy: {
                answer: {
                  rate: OrderBy.DESC,
                },
              },
            },
            userQuestions: {
              take: 1,
              include: {
                question: {
                  include: {
                    _count: {
                      select: {
                        answers: true,
                      },
                    },
                    tags: true,
                  },
                },
              },
              orderBy: [
                {
                  question: {
                    rate: OrderBy.DESC,
                  },
                },
                {
                  question: {
                    answers: {
                      _count: OrderBy.DESC,
                    },
                  },
                },
              ],
            },
          },
        },
      },
    });

    if (!user) {
      throw new NoEntityWithIdException('User');
    }

    return user;
  }

  getAnswers(userId: string, { sortBy, orderBy, searchText, pagination }: UserGetAnswersDTO) {
    return DbUtils.paginate<Prisma.AnswerFindManyArgs, DbAnswerWithQuestion>(this.answerRepository, {
      where: {
        userAnswers: {
          some: {
            userId,
            status: UserAnswerStatus.OWNER,
          },
        },
        OR: [
          {
            question: {
              title: {
                contains: searchText,
                mode: 'insensitive',
              },
            },
          },
          {
            text: {
              contains: searchText,
              mode: 'insensitive',
            },
          }
        ]
      },
      orderBy: this.getAnswersSortBy(sortBy, orderBy),
      include: {
        question: true,
      }
    }, pagination ?? {});
  }

  private getAnswersSortBy(sortBy?: UserGASortBy, orderBy?: OrderBy): Prisma.AnswerOrderByWithRelationInput {
    switch (sortBy) {
      case UserGASortBy.RATE:
        return {
          rate: orderBy ?? OrderBy.DESC,
        };
      case UserGASortBy.DATE:
        return {
          createdAt: orderBy ?? OrderBy.ASC,
        };
      case UserGASortBy.SOLUTION:
        return {
          isSolution: orderBy ?? OrderBy.DESC,
        };
    }
    return {};
  }

  getQuestions (userId: string, {sortBy, orderBy, search, tags, pagination}: UserGetQuestionsDTO) {
    return DbUtils.paginate<Prisma.QuestionFindManyArgs, DbQuestion>(this.questionRepository, {
      where: {
        title: {
          contains: search,
          mode: 'insensitive',
        },
        tags: {
          some: {
            name: {
              in: tags,
            },
          },
        },
        userQuestions: {
          some: {
            userId,
            status: UserQuestionStatus.OWNER,
          },
        }
      },
      orderBy: this.getQuestionsSortBy(sortBy, orderBy),
    }, pagination ?? {});
  }
  
  private getQuestionsSortBy(sortBy?: UserGQSortBy, orderBy?: OrderBy): Prisma.QuestionOrderByWithRelationInput {
    switch (sortBy) {
      case UserGQSortBy.ANSWERS:
        return {
          answers: {
            _count: orderBy ?? OrderBy.DESC,
          },
        };
      case UserGQSortBy.DATE:
        return {
          createdAt: orderBy ?? OrderBy.ASC,
        };
      case UserGQSortBy.RATE:
        return {
          rate: orderBy ?? OrderBy.DESC,
        };
    }
    return {};
  }

  async delete (userId: string, { email, password }: AuthLoginDTO, user: TokenPayload){
    const confirmUser = await this.userRepository.find({
      email,
    });
    if (!confirmUser){
      throw new BadBodyException("Invalid email or password");
    }
    if (confirmUser.id !== user.userId){
      throw new ForbiddenException();
    }
    if (confirmUser.id !== userId){
      throw new BadBodyException("Invalid user id");
    }
    if (!await compare(password, confirmUser.password)){
      throw new BadBodyException("Invalid email or password");
    }
    await this.userRepository.delete({id: userId});
  }
}