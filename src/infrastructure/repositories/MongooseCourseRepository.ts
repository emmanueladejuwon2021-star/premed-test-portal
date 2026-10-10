import { ICourseRepository } from "../../core/domain/repositories/ICourseRepository";
import { ICourse } from "../../core/domain/entities/ICourse";
import { Course } from "../../models";

export class MongooseCourseRepository implements ICourseRepository {
  async findAll(): Promise<ICourse[]> {
    const courses = await Course.find();
    return courses.map(course => course.toObject ? course.toObject() : course);
  }

  async findById(id: string): Promise<ICourse | null> {
    const course = await Course.findById(id);
    return course ? (course.toObject ? course.toObject() : course) : null;
  }

  async findByCode(code: string): Promise<ICourse | null> {
    const course = await Course.findOne({ code });
    return course ? (course.toObject ? course.toObject() : course) : null;
  }
}
