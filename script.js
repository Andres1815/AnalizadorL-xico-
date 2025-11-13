
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
        statLines.textContent = texto.split('\n').length;
        document.getElementById('inputCount').textContent = texto.length + ' caracteres';
    }

    window.limpiar = function() {
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
    };

    window.analizar = function() {
        const inicio = performance.now();
        const codigo = entrada.value.trim();
        if (!codigo) return limpiar();

        const tokens = lexer(codigo);
        const sintaxis = parser(tokens);
        const semantica = semanticAnalyzer(tokens);

        mostrarResultados(tokens, sintaxis, semantica);

        const fin = performance.now();
        statTime.textContent = Math.round(fin - inicio) + 'ms';
    };

    // =====================
    // ANALIZADOR LÉXICO
    // =====================
    function lexer(codigo) {
        const tokens = [];
        const palabrasReservadas = ['if', 'else', 'while', 'do', 'for', 'let', 'const', 'var', 'return'];
        let i = 0;

        while (i < codigo.length) {
            let char = codigo[i];

            if (/\s/.test(char)) { i++; continue; }

            // Palabras o identificadores
            if (/[a-zA-Z_]/.test(char)) {
                let palabra = '';
                while (i < codigo.length && /[a-zA-Z0-9_]/.test(codigo[i])) palabra += codigo[i++];
                const tipo = palabrasReservadas.includes(palabra) ? 'palabra-reservada' : 'identificador';
                tokens.push({ valor: palabra, tipo });
                continue;
            }

            // Números
            if (/[0-9]/.test(char)) {
                let numero = '';
                while (i < codigo.length && /[0-9.]/.test(codigo[i])) numero += codigo[i++];
                tokens.push({ valor: numero, tipo: 'literal' });
                continue;
            }

            // Operadores
            if (/[<>!=+\-*/]/.test(char)) {
                let operador = char;
                if (codigo[i + 1] === '=') operador += codigo[++i];
                tokens.push({ valor: operador, tipo: 'operador' });
                i++;
                continue;
            }

            // Símbolos
            if ('(){};.,:'.includes(char)) {
                tokens.push({ valor: char, tipo: 'simbolo' });
                i++;
                continue;
            }

            // Cadenas de texto
            if (char === '"' || char === "'") {
                const quote = char;
                let literal = quote;
                i++;
                while (i < codigo.length && codigo[i] !== quote) literal += codigo[i++];
                literal += quote;
                i++;
                tokens.push({ valor: literal, tipo: 'literal' });
                continue;
            }

            // Desconocido
            tokens.push({ valor: char, tipo: 'desconocido' });
            i++;
        }

        return tokens;
    }

    // =====================
    // ANALIZADOR SINTÁCTICO
    // =====================
    function parser(tokens) {
        const errores = [];
        const pila = [];

        for (let i = 0; i < tokens.length; i++) {
            const t = tokens[i];

            if (t.valor === '(' || t.valor === '{') pila.push(t.valor);
            if (t.valor === ')' || t.valor === '}') {
                const esperado = t.valor === ')' ? '(' : '{';
                if (pila.pop() !== esperado)
                    errores.push(`Error: se esperaba '${esperado}' antes de '${t.valor}'`);
            }

            if (['if', 'while', 'for'].includes(t.valor)) {
                if (tokens[i + 1]?.valor !== '(')
                    errores.push(`Error: '${t.valor}' debe ir seguido de '('`);
            }
        }

        if (pila.length > 0)
            errores.push(`Error: falta cerrar '${pila.join(', ')}'`);

        return errores.length ? { valido: false, errores } : { valido: true };
    }

    // =====================
    // ANALIZADOR SEMÁNTICO
    // =====================
    function semanticAnalyzer(tokens) {
        const errores = [];
        const declaradas = new Set();

        for (let i = 0; i < tokens.length; i++) {
            const t = tokens[i];

            // Declaraciones
            if (['let', 'var', 'const'].includes(t.valor)) {
                const siguiente = tokens[i + 1];
                if (siguiente?.tipo === 'identificador') {
                    declaradas.add(siguiente.valor);
                } else {
                    errores.push(`Error: falta nombre de variable después de '${t.valor}'`);
                }
            }

            // Uso sin declarar
            if (t.tipo === 'identificador' && !['console', 'log'].includes(t.valor)) {
                if (!declaradas.has(t.valor) &&
                    !['let', 'var', 'const'].includes(tokens[i - 1]?.valor))
                    errores.push(`Error: variable '${t.valor}' no declarada`);
            }
        }

        return errores.length ? { valido: false, errores } : { valido: true };
    }

    // =====================
    // MOSTRAR RESULTADOS
    // =====================
    function mostrarResultados(tokens, sintaxis, semantica) {
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
                    <td class="token-value">${t.valor}</td>
                </tr>`;
        });

        html += '</tbody></table></div>';

        if (!sintaxis.valido || !semantica.valido) {
            html += `<div class="errors">`;
            if (!sintaxis.valido) {
                html += `<h4>Errores sintácticos:</h4><ul>`;
                sintaxis.errores.forEach(e => html += `<li>${e}</li>`);
                html += '</ul>';
            }
            if (!semantica.valido) {
                html += `<h4>Errores semánticos:</h4><ul>`;
                semantica.errores.forEach(e => html += `<li>${e}</li>`);
                html += '</ul>';
            }
            html += '</div>';
        } else {
            html += `<p style="color:green;font-weight:600;margin-top:8px">✔ Sin errores sintácticos ni semánticos</p>`;
        }

        resultado.innerHTML = html;
        tokenCount.textContent = `${tokens.length} tokens`;
        statTokens.textContent = tokens.length;
    }
});

