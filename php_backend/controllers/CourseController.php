<?php
/**
 * Course Controller
 * Premed Test Portal (PHP + MySQL Backend)
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/auth.php';

class CourseController {
    public static function getAll(): void {
        $db = Database::getConnection();

        // Optimized query joining topics and questions count per course
        $query = "
            SELECT 
                c.*,
                COALESCE(t_agg.topics_count, 0) AS topicsCount,
                COALESCE(q_agg.questions_count, 0) AS questionsCount
            FROM courses c
            LEFT JOIN (
                SELECT course_id, COUNT(*) AS topics_count 
                FROM topics 
                GROUP BY course_id
            ) t_agg ON c.id = t_agg.course_id
            LEFT JOIN (
                SELECT t.course_id, COUNT(q.id) AS questions_count
                FROM topics t
                JOIN questions q ON t.id = q.topic_id
                GROUP BY t.course_id
            ) q_agg ON c.id = q_agg.course_id
            ORDER BY c.is_master DESC, c.code ASC
        ";

        $stmt = $db->query($query);
        $courses = $stmt->fetchAll();

        // Format boolean flags correctly for frontend JSON parsing
        $formatted = array_map(function($c) {
            $c['is_mock'] = (bool)$c['is_mock'];
            $c['is_master'] = (bool)$c['is_master'];
            $c['is_locked'] = (bool)$c['is_locked'];
            $c['results_hidden'] = (bool)$c['results_hidden'];
            $c['results_locked'] = (bool)$c['results_locked'];
            $c['force_start'] = (bool)$c['force_start'];
            $c['topicsCount'] = (int)$c['topicsCount'];
            $c['questionsCount'] = (int)$c['questionsCount'];
            $c['duration'] = (int)$c['duration'];
            $c['question_limit'] = (int)$c['question_limit'];
            return $c;
        }, $courses);

        echo json_encode($formatted);
    }

    public static function getTopics(string $courseId): void {
        $db = Database::getConnection();

        $stmt = $db->prepare("
            SELECT 
                t.*,
                COALESCE(COUNT(q.id), 0) AS actual_questions_count
            FROM topics t
            LEFT JOIN questions q ON t.id = q.topic_id
            WHERE t.course_id = ?
            GROUP BY t.id
            ORDER BY t.name ASC
        ");
        $stmt->execute([$courseId]);
        $topics = $stmt->fetchAll();

        $formatted = array_map(function($t) {
            $t['question_count'] = (int)($t['actual_questions_count'] ?: $t['question_count']);
            unset($t['actual_questions_count']);
            return $t;
        }, $topics);

        echo json_encode($formatted);
    }

    public static function getById(string $id): void {
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT * FROM courses WHERE id = ? LIMIT 1");
        $stmt->execute([$id]);
        $course = $stmt->fetch();

        if (!$course) {
            http_response_code(404);
            echo json_encode(['error' => 'Course not found']);
            return;
        }

        echo json_encode($course);
    }
}
