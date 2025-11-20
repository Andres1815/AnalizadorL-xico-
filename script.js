document.addEventListener("DOMContentLoaded", () => {
    const entrada = document.getElementById('entrada');
    const resultado = document.getElementById('resultado');
    const tokenCount = document.getElementById('tokenCount');
    const statTokens = document.getElementById('statTokens');
    const statTime = document.getElementById('statTime');
    const statLines = document.getElementById('statLines');

    entrada.addEventListener('input', actualizarEstadisticas);

    function actualizarEstadisticas() {
        const texto = entrada.value;
        statLines.textContent = texto ? texto.split('\n').length : 1;
        document.getElementById('inputCount').textContent = (texto ? texto.length : 0) + ' caracteres';
    }

    window.cargarEjemplo = function (i) {
        const ejemplos = [
            'while (i < 10) { i++; }',
            'if (x > 0) { y = 1; } else { y = -1; }',
            'do { i++; } while (i < 5);',
            'for (let i = 0; i < 10; i++) { console.log(i); }'
        ];
        entrada.value = ejemplos[i] || '';
        actualizarEstadisticas();
    };

    window.limpiar = function () {
        entrada.value = '';
        resultado.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-code"></i>
                <h3>No hay tokens para mostrar</h3>
                <p>Ingresa una instrucción y haz clic en "Analizar Código" para comenzar.</p>
            </div>
        `;
        tokenCount.textContent = '0 tokens';
        statTokens.textContent = '0';
        statTime.textContent = '0ms';
        actualizarEstadisticas();
    };

    window.analizar = function () {
        const inicio = performance.now();
        const codigo = entrada.value;
        if (!codigo || !codigo.trim()) return limpiar();

        const { tokens, errores: erroresLexicos } = lexer(codigo);

        // parser y semántica reciben siempre un arreglo
        const sintaxis = parser(tokens);
        const semantica = semanticAnalyzer(tokens);

        mostrarResultados(tokens, sintaxis, semantica, erroresLexicos);

        const fin = performance.now();
        statTime.textContent = Math.round(fin - inicio) + 'ms';
    };

    // =====================
    // LEXER
    // =====================
    function lexer(codigo) {
        const tokens = [];
        const errores = [];
        const palabrasReservadas = new Set(['if', 'else', 'while', 'do', 'for', 'let', 'const', 'var', 'return', 'break', 'continue']);

        let i = 0;
        let linea = 1;
        let columna = 1;

        function avanzar(n = 1) {
            while (n--) {
                if (codigo[i] === '\n') { linea++; columna = 1; }
                else columna++;
                i++;
            }
        }

        function peek(offset = 0) { return codigo[i + offset]; }

        while (i < codigo.length) {
            let char = peek();

            // espacios
            if (/\s/.test(char)) { avanzar(); continue; }

            // comentarios //
            if (char === '/' && peek(1) === '/') {
                while (i < codigo.length && peek() !== '\n') avanzar();
                continue;
            }

            // comentarios /* */
            if (char === '/' && peek(1) === '*') {
                const inicioLinea = linea, inicioCol = columna;
                avanzar(2);
                while (i < codigo.length && !(peek() === '*' && peek(1) === '/')) {
                    avanzar();
                }
                if (i >= codigo.length) {
                    errores.push({ tipo: 'comentario-no-cerrado', mensaje: 'Comentario de bloque no cerrado', linea: inicioLinea, columna: inicioCol });
                    break;
                }
                avanzar(2);
                continue;
            }

            // identificadores / palabras reservadas
            if (/[a-zA-Z_]/.test(char)) {
                const inicioLinea = linea, inicioCol = columna;
                let palabra = '';
                while (i < codigo.length && /[a-zA-Z0-9_]/.test(peek())) {
                    palabra += peek(); avanzar();
                }
                const tipo = palabrasReservadas.has(palabra) ? 'palabra-reservada' : 'identificador';
                tokens.push({ valor: palabra, tipo, linea: inicioLinea, columna: inicioCol });
                continue;
            }

            // numeros (enteros y decimales)
            if (/[0-9]/.test(char)) {
                const inicioLinea = linea, inicioCol = columna;
                let numero = '';
                let puntos = 0;
                while (i < codigo.length && /[0-9.]/.test(peek())) {
                    if (peek() === '.') puntos++;
                    numero += peek(); avanzar();
                }
                if (puntos > 1) {
                    errores.push({ tipo: 'numero-malformado', mensaje: 'Número con múltiples puntos', valor: numero, linea: inicioLinea, columna: inicioCol });
                }
                tokens.push({ valor: numero, tipo: 'literal', linea: inicioLinea, columna: inicioCol });
                continue;
            }

            // cadenas
            if (char === '"' || char === "'") {
                const inicioLinea = linea, inicioCol = columna;
                const quote = char;
                let literal = quote;
                avanzar();
                let closed = false;
                while (i < codigo.length) {
                    if (peek() === '\\' && peek(1)) {
                        literal += peek(); literal += peek(1); avanzar(2); continue;
                    }
                    if (peek() === quote) { literal += quote; avanzar(); closed = true; break; }
                    literal += peek(); avanzar();
                }
                if (!closed) {
                    errores.push({ tipo: 'cadena-no-cerrada', mensaje: 'Cadena no cerrada', linea: inicioLinea, columna: inicioCol });
                    // push partial literal
                }
                tokens.push({ valor: literal, tipo: 'literal', linea: inicioLinea, columna: inicioCol });
                continue;
            }

            // operadores de 2 caracteres
            const twoCharOps = new Set(['==','!=','<=','>=','++','--','+=','-=','*=','/=']);
            const maybeTwo = (peek() || '') + (peek(1) || '');
            if (twoCharOps.has(maybeTwo)) {
                tokens.push({ valor: maybeTwo, tipo: 'operador', linea, columna });
                avanzar(2);
                continue;
            }

            // operadores de 1 caracter
            if ('<>!=+-*/%'.includes(char)) {
                tokens.push({ valor: char, tipo: 'operador', linea, columna });
                avanzar();
                continue;
            }

            // simbolos
            if ('(){};.,:'.includes(char)) {
                tokens.push({ valor: char, tipo: 'simbolo', linea, columna });
                avanzar();
                continue;
            }

            // desconocido
            errores.push({ tipo: 'caracter-desconocido', mensaje: `Carácter no reconocido: '${char}'`, linea, columna });
            avanzar();
        }

        return { tokens, errores };
    }

    // =====================
    // PARSER SIMPLE
    // =====================
    function parser(tokens) {
        const errores = [];
        const pila = [];

        function error(msg, t) { errores.push(`${msg} (línea ${t?.linea || '??'}, columna ${t?.columna || '??'})`); }

        for (let i = 0; i < tokens.length; i++) {
            const t = tokens[i];
            if (!t) continue;

            // paréntesis/llaves
            if (t.valor === '(' || t.valor === '{') pila.push(t);
            if (t.valor === ')' || t.valor === '}') {
                const esperado = t.valor === ')' ? '(' : '{';
                const ultimo = pila.pop();
                if (!ultimo || ultimo.valor !== esperado) error(`Se esperaba '${esperado}' antes de '${t.valor}'`, t);
            }

            // estructuras de control: asegurar '(' después de if/while/for
            if (t.tipo === 'palabra-reservada' && ['if','while','for'].includes(t.valor)) {
                const siguiente = tokens[i + 1];
                if (!siguiente || siguiente.valor !== '(') error(`'${t.valor}' debe ir seguido de '('`, t);
            }

            // declaraciones let/const/var -> identificador
            if (t.tipo === 'palabra-reservada' && ['let','const','var'].includes(t.valor)) {
                const id = tokens[i + 1];
                if (!id || id.tipo !== 'identificador') error(`Después de '${t.valor}' debe venir un identificador`, t);
                const asign = tokens[i + 2];
                if (t.valor === 'const' && (!asign || asign.valor !== '=')) error(`'const' requiere inicialización`, id || t);
            }

            // asignaciones simples x = 5
            if (t.tipo === 'identificador') {
                const op = tokens[i + 1];
                const valor = tokens[i + 2];
                if (op && op.valor === '=') {
                    if (!valor || !['literal','identificador'].includes(valor.tipo)) error(`Asignación inválida: se esperaba un valor después de '='`, op);
                }
            }

            // punto y coma heurística (con protecciones)
            if (t.tipo && ['identificador','literal'].includes(t.tipo)) {
                const next = tokens[i + 1];
                if (next && ![';',' )',')','}','operador'].includes(next.valor) && next.tipo !== 'operador' && next.valor !== ')') {
                    // no forzamos error aquí para evitar falsos positivos, solo una advertencia opcional
                    // error(`Posiblemente falta un ';' después de la expresión`, t);
                }
            }
        }

        if (pila.length > 0) {
            const noCerrados = pila.map(p => `'${p.valor}' en línea ${p.linea}, columna ${p.columna}`);
            errores.push(`Faltan cierres: ${noCerrados.join(', ')}`);
        }

        return errores.length ? { valido: false, errores } : { valido: true };
    }

    // =====================
    // SEMÁNTICA SIMPLE
    // =====================
    function semanticAnalyzer(tokens) {
        const errores = [];
        const scopes = [new Map()];

        function error(msg, t) { errores.push(`${msg} (línea ${t?.linea || '??'}, col ${t?.columna || '??'})`); }

        function declarar(nombre, info, t) {
            const scope = scopes[scopes.length - 1];
            if (scope.has(nombre)) error(`Variable '${nombre}' ya fue declarada en este mismo bloque`, t);
            else scope.set(nombre, info);
        }

        function buscar(nombre) {
            for (let i = scopes.length - 1; i >= 0; i--) if (scopes[i].has(nombre)) return scopes[i].get(nombre);
            return null;
        }

        for (let i = 0; i < tokens.length; i++) {
            const t = tokens[i];
            if (!t) continue;

            if (t.valor === '{') scopes.push(new Map());
            if (t.valor === '}') { if (scopes.length > 1) scopes.pop(); else error('Llave de cierre sin apertura', t); }

            if (t.tipo === 'palabra-reservada' && ['let','var','const'].includes(t.valor)) {
                const nombre = tokens[i + 1];
                if (!nombre || nombre.tipo !== 'identificador') { error(`Falta nombre de variable después de '${t.valor}'`, t); continue; }
                if (['if','else','while','for','return'].includes(nombre.valor)) { error(`'${nombre.valor}' es una palabra reservada, no puedes usarla como nombre`, nombre); }
                declarar(nombre.valor, { tipo: null, constante: t.valor === 'const' }, nombre);
                const asign = tokens[i + 2];
                if (t.valor === 'const' && (!asign || asign.valor !== '=')) error(`'const' requiere inicialización`, nombre);
                continue;
            }

            if (t.tipo === 'identificador') {
                if (['console','log'].includes(t.valor)) continue;
                const info = buscar(t.valor);
                const esDeclaracion = ['let','var','const'].includes(tokens[i - 1]?.valor);
                if (!info && !esDeclaracion) error(`Variable '${t.valor}' usada sin declarar`, t);
                continue;
            }

            if (t.valor === '=') {
                const variable = tokens[i - 1];
                const valor = tokens[i + 1];
                if (!variable || variable.tipo !== 'identificador') { error(`Asignación inválida: falta variable antes de '='`, t); continue; }
                const info = buscar(variable.valor);
                if (!info) { error(`Variable '${variable.valor}' no declarada antes de asignar`, variable); continue; }
                if (!valor) { error(`Falta valor en la asignación a '${variable.valor}'`, t); continue; }
                let tipoValor = null;
                if (valor.tipo === 'literal') {
                    if (!isNaN(Number(valor.valor))) tipoValor = 'number';
                    else if (/^["'].*["']$/.test(valor.valor)) tipoValor = 'string';
                    else if (valor.valor === 'true' || valor.valor === 'false') tipoValor = 'boolean';
                }
                if (info.tipo === null) info.tipo = tipoValor;
                else if (tipoValor !== null && tipoValor !== info.tipo) error(`Tipo incompatible: '${variable.valor}' es ${info.tipo}, pero recibe ${tipoValor}`, valor);
            }

            if (t.tipo === 'identificador' && tokens[i + 1]?.valor === '(') {
                const info = buscar(t.valor);
                if (!info) error(`Función '${t.valor}' llamada sin ser declarada`, t);
            }
        }

        return errores.length ? { valido: false, errores } : { valido: true };
    }

    // =====================
    // MOSTRAR RESULTADOS
    // =====================
    function mostrarResultados(tokens, sintaxis, semantica, erroresLexicos) {
        let html = `
            <div class="result-header">
                <h3>Tokens identificados (${tokens.length})</h3>
            </div>
            <div class="table-wrapper">
                <table class="tokens-table">
                    <thead>
                        <tr><th>#</th><th>Tipo</th><th>Valor</th></tr>
                    </thead>
                    <tbody>`;

        tokens.forEach((t, i) => {
            html += `
                <tr>
                    <td>${i + 1}</td>
                    <td><span class="token-type ${t.tipo}">${t.tipo}</span></td>
                    <td class="token-value">${escapeHtml(String(t.valor))}</td>
                </tr>`;
        });

        html += '</tbody></table></div>';

        const erroresTotales = [];
        if (!sintaxis.valido) erroresTotales.push({ titulo: 'Errores sintácticos', lista: sintaxis.errores });
        if (!semantica.valido) erroresTotales.push({ titulo: 'Errores semánticos', lista: semantica.errores });
        if (erroresLexicos && erroresLexicos.length) erroresTotales.push({ titulo: 'Errores léxicos', lista: erroresLexicos.map(e => `${e.mensaje} (línea ${e.linea}, col ${e.columna})`) });

        if (erroresTotales.length) {
            html += `<div class="errors">`;
            erroresTotales.forEach(block => {
                html += `<h4>${block.titulo}:</h4><ul>`;
                block.lista.forEach(e => html += `<li>${escapeHtml(String(e))}</li>`);
                html += `</ul>`;
            });
            html += `</div>`;
        } else {
            html += `<p style="color:green;font-weight:600;margin-top:8px">✔ Sin errores LÉXICOS, sintácticos ni semánticos</p>`;
        }

        resultado.innerHTML = html;
        tokenCount.textContent = `${tokens.length} tokens`;
        statTokens.textContent = tokens.length;
    }

    function escapeHtml(str) { return str.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[ch]); }

    // inicializar
    actualizarEstadisticas();
});
