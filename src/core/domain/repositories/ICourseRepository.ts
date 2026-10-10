import { ICourse } from "../entities/ICourse";

export interface ICourseRepository {
  findAll(): Promise<ICourse[]>;
  findById(id: string): Promise<ICourse | null>;
  findByCode(code: string): Promise<ICourse | null>;
}
