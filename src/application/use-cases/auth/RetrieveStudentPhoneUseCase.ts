import { IStudentRepository } from "../../../core/domain/repositories/IStudentRepository";

export class RetrieveStudentPhoneUseCase {
  constructor(private studentRepository: IStudentRepository) {}

  async execute(email: string): Promise<{ success: boolean; phone: string }> {
    if (!email) {
      throw new Error("Email is required to retrieve your phone number.");
    }

    const targetEmail = String(email).trim().toLowerCase();
    const student = await this.studentRepository.findByEmail(targetEmail);

    if (!student) {
      throw new Error("email not found");
    }

    if (!student.phone) {
      throw new Error("No phone number is registered with this email address yet.");
    }

    return { success: true, phone: student.phone };
  }
}
