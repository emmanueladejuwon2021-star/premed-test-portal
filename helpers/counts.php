<?php
/**
 * Single Source of Truth for Question & Topic Counts
 * Apex Pre-Medical Sciences Examination Portal
 */

if (!function_exists('getQuestionCountsByTopic')) {
    /**
     * Retrieves live question counts grouped by topic_id.
     * @param TursoPDO|PDO $pdo
     * @param string|null $courseId Optional filter by course_id
     * @return array Map of topic_id => ['total' => int, 'past' => int, 'test' => int]
     */
    function getQuestionCountsByTopic($pdo, ?string $courseId = null): array {
        $sql = "
            SELECT
                q.topic_id,
                COUNT(q.id) AS total_count,
                SUM(CASE WHEN q.bank_type = 'past' OR q.bank_type IS NULL OR q.bank_type = '' THEN 1 ELSE 0 END) AS past_count,
                SUM(CASE WHEN q.bank_type = 'test' THEN 1 ELSE 0 END) AS test_count
            FROM questions q
            JOIN topics t ON q.topic_id = t.id
        ";
        $params = [];
        if ($courseId) {
            $sql .= " WHERE t.course_id = ?";
            $params[] = $courseId;
        }
        $sql .= " GROUP BY q.topic_id";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $counts = [];
        foreach ($rows as $row) {
            $counts[$row['topic_id']] = [
                'total' => (int)($row['total_count'] ?? 0),
                'past'  => (int)($row['past_count'] ?? 0),
                'test'  => (int)($row['test_count'] ?? 0)
            ];
        }
        return $counts;
    }
}

if (!function_exists('getQuestionCountsByCourse')) {
    /**
     * Retrieves live question counts grouped by course_id.
     * @param TursoPDO|PDO $pdo
     * @return array Map of course_id => ['total' => int, 'past' => int, 'test' => int]
     */
    function getQuestionCountsByCourse($pdo): array {
        $sql = "
            SELECT
                t.course_id,
                COUNT(q.id) AS total_count,
                SUM(CASE WHEN q.bank_type = 'past' OR q.bank_type IS NULL OR q.bank_type = '' THEN 1 ELSE 0 END) AS past_count,
                SUM(CASE WHEN q.bank_type = 'test' THEN 1 ELSE 0 END) AS test_count
            FROM questions q
            JOIN topics t ON q.topic_id = t.id
            GROUP BY t.course_id
        ";
        $stmt = $pdo->query($sql);
        $rows = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];

        $counts = [];
        foreach ($rows as $row) {
            $counts[$row['course_id']] = [
                'total' => (int)($row['total_count'] ?? 0),
                'past'  => (int)($row['past_count'] ?? 0),
                'test'  => (int)($row['test_count'] ?? 0)
            ];
        }
        return $counts;
    }
}

if (!function_exists('getCourseListWithCounts')) {
    /**
     * Returns all courses enriched with accurate live topic and question counts.
     * @param TursoPDO|PDO $pdo
     * @return array List of course arrays with live counts
     */
    function getCourseListWithCounts($pdo): array {
        // Fetch all courses
        $coursesStmt = $pdo->query("SELECT * FROM courses ORDER BY code ASC");
        $courses = $coursesStmt ? $coursesStmt->fetchAll(PDO::FETCH_ASSOC) : [];

        // Fetch live topic count per course
        $topicCountStmt = $pdo->query("SELECT course_id, COUNT(id) as cnt FROM topics GROUP BY course_id");
        $topicCounts = [];
        if ($topicCountStmt) {
            foreach ($topicCountStmt->fetchAll(PDO::FETCH_ASSOC) as $tc) {
                $topicCounts[$tc['course_id']] = (int)$tc['cnt'];
            }
        }

        // Fetch live question counts per course
        $qCountsByCourse = getQuestionCountsByCourse($pdo);

        foreach ($courses as &$c) {
            $cid = $c['id'];
            $c['topics_count']    = $topicCounts[$cid] ?? 0;
            $c['questions_count'] = $qCountsByCourse[$cid]['total'] ?? 0;
            $c['past_q_count']    = $qCountsByCourse[$cid]['past'] ?? 0;
            $c['test_q_count']    = $qCountsByCourse[$cid]['test'] ?? 0;
            $c['question_count']  = $c['questions_count'];
        }
        unset($c);

        return $courses;
    }
}

if (!function_exists('getTopicListWithCounts')) {
    /**
     * Returns topics enriched with accurate live question counts.
     * @param TursoPDO|PDO $pdo
     * @param string|null $courseId Optional filter by course_id
     * @return array List of topic arrays with live counts
     */
    function getTopicListWithCounts($pdo, ?string $courseId = null): array {
        $sql = "SELECT t.*, c.code as course_code, c.title as course_title FROM topics t LEFT JOIN courses c ON t.course_id = c.id";
        $params = [];
        if ($courseId) {
            $sql .= " WHERE t.course_id = ?";
            $params[] = $courseId;
        }
        $sql .= " ORDER BY t.name ASC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $topics = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $qCountsByTopic = getQuestionCountsByTopic($pdo, $courseId);

        foreach ($topics as &$t) {
            $tid = $t['id'];
            $t['questions_count'] = $qCountsByTopic[$tid]['total'] ?? 0;
            $t['past_q_count']    = $qCountsByTopic[$tid]['past'] ?? 0;
            $t['test_q_count']    = $qCountsByTopic[$tid]['test'] ?? 0;
            $t['question_count']  = $t['questions_count']; // Enforce live count over DB column
        }
        unset($t);

        return $topics;
    }
}
