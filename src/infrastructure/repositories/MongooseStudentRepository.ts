import { IStudentRepository } from "../../core/domain/repositories/IStudentRepository";
import { IStudent } from "../../core/domain/entities/IStudent";
import { Student } from "../../models";

export class MongooseStudentRepository implements IStudentRepository {
  async findByMatricNo(matricNo: string): Promise<IStudent | null> {
    const student = await Student.findOne({ matric_no: matricNo });
    return student ? (student.toObject ? student.toObject() : student) : null;
  }

  async findByEmail(email: string): Promise<IStudent | null> {
    const escapedEmail = email.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const student = await Student.findOne({ 
      email: { $regex: new RegExp("^" + escapedEmail + "$", "i") } 
    });
    return student ? (student.toObject ? student.toObject() : student) : null;
  }

  async findById(id: string): Promise<IStudent | null> {
    const student = await Student.findById(id);
    return student ? (student.toObject ? student.toObject() : student) : null;
  }

  async create(studentData: Partial<IStudent>): Promise<IStudent> {
    const student = new Student(studentData);
    const saved = await student.save();
    return saved.toObject ? saved.toObject() : saved;
  }

  async save(studentData: IStudent): Promise<IStudent> {
    const student = await Student.findById(studentData._id);
    if (!student) {
      throw new Error(`Student with ID ${studentData._id} not found`);
    }
    
    // Update fields
    if (studentData.name) student.name = studentData.name;
    if (studentData.email) student.email = studentData.email;
    if (studentData.phone !== undefined) student.phone = studentData.phone;
    if (studentData.password) student.password = studentData.password;
    if (studentData.department) student.department = studentData.department;
    if (studentData.strength) student.strength = studentData.strength;
    if (studentData.session_token_id !== undefined) student.session_token_id = studentData.session_token_id;
    
    const saved = await student.save();
    return saved.toObject ? saved.toObject() : saved;
  }
}
