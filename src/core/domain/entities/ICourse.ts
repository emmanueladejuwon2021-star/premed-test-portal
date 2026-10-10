export interface ICourse {
  _id?: string;
  code: string;
  title: string;
  icon?: string;
  scheduled_date?: string;
  end_date?: string;
  is_mock?: boolean;
  results_hidden?: boolean;
  force_start?: boolean;
  duration?: number;
  question_limit?: number;
  attempts_allowed?: number;
  question_timer_limit?: number;
  is_locked?: boolean;
  results_locked?: boolean;
  selected_topic_id?: string;
  is_master?: boolean;
  multicourse_config?: string;
}
