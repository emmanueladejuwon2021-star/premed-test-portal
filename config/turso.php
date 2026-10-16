<?php
/**
 * Turso Database Client (libSQL over HTTP v2 pipeline)
 * Production Cloud Driver for Premed Test Portal
 */

class TursoPDO {
    private string $url;
    private string $token;
    private ?string $lastInsertId = null;

    public function __construct(string $url, string $token) {
        $this->url = rtrim($url, '/') . '/v2/pipeline';
        $this->token = $token;
    }

    public function prepare(string $sql, array $options = []): TursoStatement {
        return new TursoStatement($this, $sql);
    }

    public function query(string $sql): TursoStatement {
        $stmt = new TursoStatement($this, $sql);
        $stmt->execute();
        return $stmt;
    }

    public function exec(string $sql): int {
        $stmt = new TursoStatement($this, $sql);
        $stmt->execute();
        return $stmt->rowCount();
    }

    public function lastInsertId(?string $name = null): ?string {
        return $this->lastInsertId;
    }

    public function setLastInsertId(?string $id): void {
        $this->lastInsertId = $id;
    }

    public function executePipeline(array $requests): array {
        $payload = json_encode(['requests' => $requests]);

        $ch = curl_init($this->url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $this->token,
                'Content-Type: application/json'
            ],
            CURLOPT_TIMEOUT => 25,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_TCP_KEEPALIVE => 1
        ]);

        $rawResponse = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($rawResponse === false || $httpCode < 200 || $httpCode >= 300) {
            throw new Exception("Turso Database Error (HTTP $httpCode): " . ($curlError ?: substr((string)$rawResponse, 0, 300)));
        }

        $decoded = json_decode($rawResponse, true);
        if (!is_array($decoded) || !isset($decoded['results'])) {
            throw new Exception("Invalid JSON Response from Turso DB: " . substr($rawResponse, 0, 200));
        }

        return $decoded['results'];
    }
}

class TursoStatement {
    private TursoPDO $pdo;
    private string $sql;
    private array $rows = [];
    private int $cursor = 0;
    private int $affectedRows = 0;

    public function __construct(TursoPDO $pdo, string $sql) {
        $this->pdo = $pdo;
        $this->sql = $sql;
    }

    public function execute(?array $params = null): bool {
        $this->rows = [];
        $this->cursor = 0;
        $this->affectedRows = 0;

        $args = [];
        if (!empty($params)) {
            foreach ($params as $p) {
                if ($p === null) {
                    $args[] = ['type' => 'null'];
                } elseif (is_int($p)) {
                    $args[] = ['type' => 'integer', 'value' => (string)$p];
                } elseif (is_float($p)) {
                    $args[] = ['type' => 'float', 'value' => $p];
                } else {
                    $args[] = ['type' => 'text', 'value' => (string)$p];
                }
            }
        }

        $stmt = ['sql' => $this->sql];
        if (!empty($args)) {
            $stmt['args'] = $args;
        }

        $requests = [
            ['type' => 'execute', 'stmt' => $stmt],
            ['type' => 'close']
        ];

        $results = $this->pdo->executePipeline($requests);

        // Check for error in pipeline response
        if (!empty($results[0]['error'])) {
            $msg = $results[0]['error']['message'] ?? json_encode($results[0]['error']);
            throw new Exception("Turso Database Execution Error: " . $msg);
        }
        if (!empty($results[0]['response']['error'])) {
            $msg = $results[0]['response']['error']['message'] ?? json_encode($results[0]['response']['error']);
            throw new Exception("Turso Database Execution Error: " . $msg);
        }

        if (!empty($results[0]['response']['result'])) {
            $res = $results[0]['response']['result'];
            $cols = $res['cols'] ?? [];
            $rawRows = $res['rows'] ?? [];
            $this->affectedRows = (int)($res['affected_row_count'] ?? 0);

            if (!empty($res['last_insert_rowid'])) {
                $this->pdo->setLastInsertId((string)$res['last_insert_rowid']);
            }

            foreach ($rawRows as $row) {
                $mapped = [];
                foreach ($cols as $idx => $col) {
                    $valObj = $row[$idx] ?? null;
                    $colName = $col['name'] ?? "col_$idx";
                    if ($valObj === null || ($valObj['type'] ?? '') === 'null') {
                        $mapped[$colName] = null;
                    } else {
                        $mapped[$colName] = $valObj['value'] ?? null;
                    }
                }
                $this->rows[] = $mapped;
            }
        }

        return true;
    }

    public function fetch(int $mode = PDO::FETCH_ASSOC): mixed {
        if ($this->cursor >= count($this->rows)) {
            return false;
        }
        $row = $this->rows[$this->cursor];
        $this->cursor++;
        return $row;
    }

    public function fetchAll(int $mode = PDO::FETCH_ASSOC): array {
        if ($this->cursor === 0) {
            $this->cursor = count($this->rows);
            return $this->rows;
        }
        $remaining = array_slice($this->rows, $this->cursor);
        $this->cursor = count($this->rows);
        return $remaining;
    }

    public function fetchColumn(int $colIndex = 0): mixed {
        $row = $this->fetch();
        if ($row === false) return false;
        $values = array_values($row);
        return $values[$colIndex] ?? false;
    }

    public function rowCount(): int {
        return !empty($this->rows) ? count($this->rows) : $this->affectedRows;
    }
}
