const ejemplos = [
            "while (i < 10) { i++; }",
            "if (x > 5) { resultado = 'mayor'; } else { resultado = 'menor'; }",
            "do { contador++; } while (contador < 100);",
            "for (let i = 0; i < array.length; i++) { console.log(array[i]); }"
        ];
        
        // Actualizar contador de caracteres
        document.getElementById('entrada').addEventListener('input', function() {
            const count = this.value.length;
            document.getElementById('inputCount').textContent = count + ' caracteres';
            
            // Actualizar contador de líneas
            const lines = this.value.split('\n').length;
            document.getElementById('statLines').textContent = lines;
        });
        
        function cargarEjemplo(indice) {
            document.getElementById('entrada').value = ejemplos[indice];
            document.getElementById('entrada').dispatchEvent(new Event('input'));
            analizar();
        }
        
        function limpiar() {
            document.getElementById('entrada').value = '';
            document.getElementById('entrada').dispatchEvent(new Event('input'));
            document.getElementById('resultado').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-code"></i>
                    <h3>No hay tokens para mostrar</h3>
                    <p>Ingresa una instrucción y haz clic en "Analizar Código" para comenzar.</p>
                </div>
            `;
            document.getElementById('tokenCount').textContent = '0 tokens';
            document.getElementById('statTokens').textContent = '0';
            document.getElementById('statTime').textContent = '0ms';
        }
        
        function analizar() {
            const inicio = performance.now();
            const entrada = document.getElementById('entrada').value.trim();
            
            if (!entrada) {
                limpiar();
                return;
            }
            
            const tokens = lexer(entrada);
            mostrarTokens(tokens);
            
            const fin = performance.now();
            document.getElementById('statTime').textContent = Math.round(fin - inicio) + 'ms';
        }
        
        function lexer(codigo) {
            const tokens = [];
            let i = 0;
            const palabrasReservadas = ['while', 'if', 'else', 'do', 'for', 'let', 'console', 'log'];
            
            while (i < codigo.length) {
                let char = codigo[i];
                
                // Ignorar espacios y saltos de línea
                if (/\s/.test(char)) {
                    i++;
                    continue;
                }
                
                // Identificar palabras reservadas o identificadores
                if (/[a-zA-Z_]/.test(char)) {
                    let palabra = '';
                    while (i < codigo.length && /[a-zA-Z0-9_]/.test(codigo[i])) {
                        palabra += codigo[i];
                        i++;
                    }
                    const tipo = palabrasReservadas.includes(palabra.toLowerCase()) ? 'palabra-reservada' : 'identificador';
                    tokens.push({ valor: palabra, tipo });
                    continue;
                }
                
                // Números (literales)
                if (/[0-9]/.test(char)) {
                    let numero = '';
                    while (i < codigo.length && /[0-9.]/.test(codigo[i])) {
                        numero += codigo[i];
                        i++;
                    }
                    tokens.push({ valor: numero, tipo: 'literal' });
                    continue;
                }
                
                // Operadores
                if (/[<>!=+\-*/]/.test(char)) {
                    let operador = char;
                    i++;
                    if (codigo[i] === '=') {
                        operador += '=';
                        i++;
                    }
                    tokens.push({ valor: operador, tipo: 'operador' });
                    continue;
                }
                
                // Símbolos
                if ('(){};.,:'.includes(char)) {
                    tokens.push({ valor: char, tipo: 'simbolo' });
                    i++;
                    continue;
                }
                
                // Cadenas de texto (entre comillas)
                if (char === '"' || char === "'") {
                    const comilla = char;
                    let cadena = comilla;
                    i++;
                    
                    while (i < codigo.length && codigo[i] !== comilla) {
                        cadena += codigo[i];
                        i++;
                    }
                    
                    if (i < codigo.length) {
                        cadena += codigo[i]; // Cerrar comilla
                        i++;
                    }
                    
                    tokens.push({ valor: cadena, tipo: 'literal' });
                    continue;
                }
                
                // Carácter desconocido
                tokens.push({ valor: char, tipo: 'desconocido' });
                i++;
            }
            
            return tokens;
        }
        
        function mostrarTokens(tokens) {
            const resultado = document.getElementById('resultado');
            const tokenCount = document.getElementById('tokenCount');
            const statTokens = document.getElementById('statTokens');
            
            if (tokens.length === 0) {
                resultado.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-file-code"></i>
                        <h3>No se encontraron tokens</h3>
                        <p>La instrucción no contiene elementos reconocibles</p>
                    </div>
                `;
                tokenCount.textContent = '0 tokens';
                statTokens.textContent = '0';
                return;
            }
            
            let html = `
                <div class="result-header">
                    <h3>Tokens identificados</h3>
                </div>
                <div class="table-wrapper">
                <table class="tokens-table">
                    <thead>
                        <tr>
                            <th width="50">#</th>
                            <th width="150">Tipo</th>
                            <th>Valor</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            tokens.forEach((token, index) => {
                html += `
                    <tr>
                        <td>${index + 1}</td>
                        <td><span class="token-type ${token.tipo}">${token.tipo.replace('-', ' ')}</span></td>
                        <td class="token-value">${token.valor}</td>
                    </tr>
                `;
            });
            
            html += '</tbody></table></div>';
            resultado.innerHTML = html;
            tokenCount.textContent = `${tokens.length} tokens`;
            statTokens.textContent = tokens.length;
        }
        
        function exportarResultados() {
            const tokens = lexer(document.getElementById('entrada').value.trim());
            if (tokens.length === 0) {
                alert('No hay resultados para exportar');
                return;
            }
            
            let contenido = "Resultados del Análisis Léxico\n";
            contenido += "===============================\n\n";
            
            tokens.forEach((token, index) => {
                contenido += `[${index + 1}] ${token.tipo.replace('-', ' ')}: "${token.valor}"\n`;
            });
            
            const blob = new Blob([contenido], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'analisis_lexico.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        
        // Inicializar contadores al cargar
        window.onload = function() {
            document.getElementById('entrada').dispatchEvent(new Event('input'));
            analizar();
        };