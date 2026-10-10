import { IStudent } from "../entities/IStudent";

export interface IStudentRepository {
  findByMatricNo(matricNo: string): Promise<IStudent | null>;
  findByEmail(email: string): Promise<IStudent | null>;
  findById(id: string): Promise<IStudent | null>;
  create(student: Partial<IStudent>): Promise<IStudent>;
  save(student: IStudent): Promise<IStudent>;
}
