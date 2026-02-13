<?php
//FUNCION GENERAL PARA CAMBIAR ESTADO
function cambiarEstadoHelper($model, $body) {
    if (!isset($body['id']) || !isset($body['activo'])) {
        error('ID y activo son requeridos', 400);
    }

    try {
        $model->setActivo($body['id'], $body['activo']);
        response(['ok' => true]);
    } catch (Exception $e) {
        error($e->getMessage());
    }
}

// FUNCION GENERAL PARA ELIMINAR
function eliminarHelper($model, $body) {
    if (!isset($body['id'])) {
        error('ID requerido para eliminar', 400);
    }

    try {
        $model->delete($body['id']);
        response(['ok' => true]);
    } catch (Exception $e) {
        error($e->getMessage());
    }
}


function getBody() {
    return json_decode(file_get_contents('php://input'), true) ?? [];
}

function validate($data, $required) {
    foreach ($required as $field) {
        if (!isset($data[$field])) {
            error("Campo requerido: $field", 400);
        }
    }
}

function response($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function error($msg, $code = 500) {
    http_response_code($code);
    echo json_encode(['error' => $msg]);
    exit;
}

