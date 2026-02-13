<?php

require_once __DIR__ . '/../config/conexion.php';
require_once __DIR__ . '/../helpers/functions.php';

abstract class BaseModel
{
    protected $db;
    protected $table;
    protected $fields = [];

    public function __construct()
    {
        $this->db = Conexion::getConexion();
    }

    public function getAll(array $columns = ['*'])
    {
        $cols = implode(', ', $columns);
        $sql = "SELECT {$cols} FROM {$this->table} ORDER BY id";
        return $this->db->query($sql)->fetchAll();
    }

    public function getById($id, array $columns = ['*'])
    {
        $cols = implode(', ', $columns);

        $stmt = $this->db->prepare(
            "SELECT {$cols} FROM {$this->table} WHERE id = :id"
        );

        $stmt->execute(['id' => $id]);
        return $stmt->fetch();
    }

    public function create(array $data)
    {
        $data = array_intersect_key($data, array_flip($this->fields));

        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $data[$key] = json_encode($value);
            }
        }

        $cols = implode(', ', array_keys($data));
        $vals = implode(', ', array_map(fn($f) => ":$f", array_keys($data)));

        $sql = "
            INSERT INTO {$this->table} ({$cols})
            VALUES ({$vals})
    RETURNING id
";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($data);

        return $stmt->fetchColumn();
    }

    public function update($id, array $data)
    {
        $data = array_intersect_key($data, array_flip($this->fields));

        $set = implode(', ', array_map(fn($f) => "$f = :$f", array_keys($data)));

        $sql = "
            UPDATE {$this->table}
            SET {$set}
            WHERE id = :id
        ";

        $data['id'] = $id;

        $stmt = $this->db->prepare($sql);
        $stmt->execute($data);

        return true;
    }

    public function delete($id)
    {
        $stmt = $this->db->prepare(
            "DELETE FROM {$this->table} WHERE id = :id"
        );

        return $stmt->execute(['id' => $id]);
    }


    public function setActivo($id, bool $activo)
    {
        $stmt = $this->db->prepare("
            UPDATE {$this->table}
            SET activo = :activo
            WHERE id = :id
        ");

        return $stmt->execute([
            'id' => $id,
            'activo' => $activo ? 1 : 0
        ]);
    }
}
