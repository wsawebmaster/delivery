    // Variáveis de estado global (reduzidas e essenciais)
    let cart = [];
    let total = 0;
    let bairroValor = 0;
    let bairroNome = "";
    let enderecoBase = "";
    let lastCep = null;

    // Funções de manipulação do carrinho e da UI
    function changeQuantity(name, price, change) {
        const quantityElement = document.getElementById(`quantity-${name}`);
        let quantity = parseInt(quantityElement.textContent) || 0;
        quantity += change;

        if (quantity < 0) quantity = 0;
        quantityElement.textContent = quantity;

        // Keep numeric value styling neutral — only use bold when needed
        if (quantity === 0) {
            quantityElement.classList.add('zero');
        } else {
            quantityElement.classList.remove('zero');
        }

        // Toggle visibility of the minus button for this item using class selector
        const parent = quantityElement.parentElement;
        if (parent) {
            const minusButton = parent.querySelector('button.minus');
            if (minusButton) {
                if (quantity === 0) {
                    minusButton.classList.add('minus-hidden');
                } else {
                    minusButton.classList.remove('minus-hidden');
                }
            }
        }

        if (quantity > 0) {
            const existingItem = cart.find(item => item.name === name);
            if (existingItem) {
                existingItem.quantity = quantity;
            } else {
                cart.push({ name, price, quantity });
            }
        } else {
            cart = cart.filter(item => item.name !== name);
        }
        
        // Update visual state for the menu item: add 'added' class when quantity >= 1
        updateMenuItemState(name, quantity);

        updateUI();
    }

    function updateMenuItemState(name, quantity) {
        // Find the .menu-item containing the span with this id
        const spanId = `quantity-${name}`;
        const span = document.getElementById(spanId);
        if (!span) return;
        const menuItem = span.closest('.menu-item');
        if (!menuItem) return;

        // Remove existing badge if any
        const existingBadge = menuItem.querySelector('.added-badge');
        if (existingBadge) existingBadge.remove();

        if (quantity >= 1) {
            menuItem.classList.add('added');
            // Add a small green check emoji badge in bottom-right
            const badge = document.createElement('div');
            badge.className = 'added-badge';
            badge.setAttribute('aria-hidden', 'true');
            badge.textContent = '✅';
            menuItem.appendChild(badge);
        } else {
            menuItem.classList.remove('added');
        }
    }

    // Função principal para atualizar toda a interface do usuário
    function updateUI() {
        updateCartItems();
        updateTotals();
        toggleCartButton();
    }

    // Funções de responsabilidade única para a UI
    function updateCartItems() {
        const cartItems = document.getElementById('cartItems');
        cartItems.innerHTML = '';
        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            const li = document.createElement('li');
            li.textContent = `${item.quantity} x ${item.name} - R$ ${itemTotal.toFixed(2).replace('.', ',')}`;
            cartItems.appendChild(li);
        });
    }

    function updateTotals() {
        total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        document.getElementById('totalValue').textContent = `Total dos Itens: R$ ${total.toFixed(2).replace('.', ',')}`;
        document.getElementById('entregaValue').textContent = `Valor da Entrega: R$ ${bairroValor.toFixed(2).replace('.', ',')}`;
        const finalTotal = total + bairroValor;
        document.getElementById('finalTotal').textContent = `Total Geral: R$ ${finalTotal.toFixed(2).replace('.', ',')}`;
        document.getElementById('bottomTotalValue').textContent = `Subtotal: R$ ${total.toFixed(2).replace('.', ',')}`;
        // Update cart item count (sum of quantities)
        const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
        const cartCountEl = document.getElementById('cartCount');
        if (cartCountEl) {
            cartCountEl.textContent = `${totalItems} ${totalItems === 1 ? 'item' : 'itens'}`;
        }
    }

    function toggleCartButton() {
        const cartButton = document.getElementById('cartButton');
        const bottomMenu = document.getElementById('bottomMenu');
        if (cart.length > 0) {
            cartButton.classList.add('show');
            bottomMenu.classList.add('show');
        } else {
            cartButton.classList.remove('show');
            bottomMenu.classList.remove('show');
        }
    }

    // Funções de endereço e finalização do pedido
    function buscarEndereco() {
        const cep = document.getElementById('cepInput').value.replace(/\D/g, '');
        if (cep.length !== 8 || cep === lastCep) {
            return;
        }
        lastCep = cep;

        fetch(`https://viacep.com.br/ws/${cep}/json/`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro na requisição');
                }
                return response.json();
            })
            .then(data => {
                if (data.erro) {
                    alert("CEP não encontrado.");
                    resetAddressInfo();
                } else {
                    bairroNome = data.bairro;
                    const bairrosValidos = {
                        "Jardim Antártica": 5,
                        "Vila Tibério": 5,
                        "Jardim Paiva": 10
                    };
                    
                    if (bairrosValidos.hasOwnProperty(bairroNome)) {
                        bairroValor = bairrosValidos[bairroNome];
                        enderecoBase = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
                        const enderecoInfo = document.getElementById('enderecoInfo');
                        enderecoInfo.textContent = enderecoBase;
                        enderecoInfo.style.display = 'block';
                    } else {
                        alert("Não entregamos no bairro informado.");
                        resetAddressInfo();
                    }
                }
                updateUI();
            })
            .catch(error => {
                console.error("Erro ao buscar o endereço:", error);
                alert("Erro ao buscar o endereço. Verifique o CEP.");
                resetAddressInfo();
                updateUI();
            });
    }

    function resetAddressInfo() {
        bairroNome = "";
        bairroValor = 0;
        enderecoBase = "";
        document.getElementById('enderecoInfo').style.display = 'none';
        document.getElementById('cepInput').value = '';
    }

    // Validação de entrada para aceitar apenas números
    function validateNumberInput(event) {
        event.target.value = event.target.value.replace(/\D/g, '');
    }

    // Validação do telefone
    function validatePhone(phone) {
        const phoneRegex = /^(?:55)?(\d{2})9(\d{8})$/;
        return phoneRegex.test(phone.replace(/\D/g, ''));
    }

    // Proteção contra SQL Injection
    function sanitizeInput(input) {
        return input.replace(/['";=()<>`]/g, '');
    }

    function finalizeOrder() {
        if (!validateOrder()) {
            return;
        }

        const message = buildWhatsAppMessage();
        const whatsappLink = `https://api.whatsapp.com/send?phone=5511982470496&text=${encodeURIComponent(message)}`;
        window.open(whatsappLink, '_blank');
    }

    function validateOrder() {
        const clienteNome = document.getElementById('clienteNome').value;
        const clienteTelefone = document.getElementById('clienteTelefone').value;
        const numeroResidencia = document.getElementById('numeroInput').value;
        const formaPagamento = document.getElementById('formaPagamento').value;

        if (cart.length === 0) {
            alert("Seu carrinho está vazio!");
            return false;
        }
        if (bairroValor === 0) {
            alert("Por favor, informe um CEP para calcular a entrega.");
            return false;
        }
        if (!clienteNome || !clienteTelefone || !numeroResidencia || !formaPagamento) {
            alert("Por favor, preencha todos os campos obrigatórios.");
            return false;
        }
        if (!validatePhone(clienteTelefone)) {
            alert("Por favor, insira um telefone válido com 11 dígitos (ex: 11982470496).");
            return false;
        }
        if (!numeroResidencia) {
            alert("Por favor, preencha o número da residência.");
            return false;
        }

        return true;
    }

    function buildWhatsAppMessage() {
        const pontoReferencia = sanitizeInput(document.getElementById('pontoReferenciaInput').value);
        const numeroResidencia = sanitizeInput(document.getElementById('numeroInput').value);
        const clienteNome = sanitizeInput(document.getElementById('clienteNome').value);
        const clienteTelefone = sanitizeInput(document.getElementById('clienteTelefone').value);
        const formaPagamento = sanitizeInput(document.getElementById('formaPagamento').value);
        
        const enderecoCompleto = enderecoBase.replace(",", `, ${numeroResidencia},`);
        
        let itemsMessage = cart.map(item => `${item.quantity} - ${item.name} - R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}`).join('\n');
        
        const totalItens = total.toFixed(2).replace('.', ',');
        const totalGeral = (total + bairroValor).toFixed(2).replace('.', ',');
        const entrega = bairroValor.toFixed(2).replace('.', ',');

        return `Olá, Fabin Lanches!
    
✅ Segue meu pedido de hoje:
    
${itemsMessage}
    
Taxa de Entrega: R$ ${entrega}
🤑 Total do Pedido: R$ ${totalGeral}
💳 Pagamento por: ${formaPagamento}
    
🛵 Endereço de entrega:
${enderecoCompleto}
📍 Ponto de Referência: ${pontoReferencia}
📞 Telefone: ${clienteTelefone}
    
*Aguardo ansiosamente! 😋*`;
    }

    // Funções para exibição das modais
    function showCartModal() {
        document.getElementById('cartModal').style.display = 'flex';
    }

    function showBairrosModal() {
        document.getElementById('bairrosModal').style.display = 'flex';
    }

    function closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    // Adicionando eventos para validar campos
    document.getElementById('clienteTelefone').addEventListener('input', validateNumberInput);
    document.getElementById('numeroInput').addEventListener('input', validateNumberInput);

    // Initialize quantity controls on load: hide minus buttons when quantity is 0 and style zeros
    function initQuantityControls() {
        const spans = document.querySelectorAll('.quantity-controls span');
        spans.forEach(span => {
            const q = parseInt(span.textContent) || 0;
            if (q === 0) {
                span.classList.add('zero');
            } else {
                span.classList.remove('zero');
            }
            const parent = span.parentElement;
            if (parent) {
                const minusButton = parent.querySelector('button');
                if (minusButton) {
                    if (q === 0) {
                        minusButton.classList.add('minus-hidden');
                    } else {
                        minusButton.classList.remove('minus-hidden');
                    }
                }
            }
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        // Render dynamic categories/menu (non-destructive) then init controls
        if (typeof renderCategories === 'function') renderCategories();
        if (typeof renderMenu === 'function') renderMenu();
        initQuantityControls();
    });

    /* --- dynamic menu generator (keeps current changeQuantity API) --- */
    const menuData = [
        {
            id: 'lanches',
            title: 'Lanches',
            items: [
                { name: 'X Burgu\u00ear', price: 12 },
                { name: 'X Egg Bacon', price: 16 },
                { name: 'X Salada', price: 17 },
                { name: 'X Salada Egg', price: 20 },
                { name: 'X Tudo', price: 28 }
            ]
        },
        {
            id: 'hot-dog',
            title: 'Hot dog',
            items: [
                { name: 'Hot Dog Simples', price: 8 },
                { name: 'Hot Dog Completo', price: 12 }
            ]
        },
        {
            id: 'bebidas',
            title: 'Refrigerantes',
            items: [
                { name: 'Coca-Cola 350ml', price: 5 },
                { name: 'Guaran\u00e1 350ml', price: 5 }
            ]
        }
    ];

    let activeCategory = menuData[0].id;

    function renderCategories() {
        const bar = document.getElementById('categoriesBar');
        if (!bar) return;
        bar.innerHTML = '';
        menuData.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'category-btn';
            btn.textContent = cat.title;
            btn.dataset.cat = cat.id;
            btn.addEventListener('click', () => {
                activeCategory = cat.id;
                // update active class
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderMenu();
            });
            if (cat.id === activeCategory) btn.classList.add('active');
            bar.appendChild(btn);
        });
    }

    function renderMenu() {
        const menu = document.getElementById('menu');
        if (!menu) return;
        // Remove fallback static block if present
        const staticBlock = menu.querySelector('.menu-static');
        if (staticBlock) staticBlock.remove();
        menu.innerHTML = '';
        const category = menuData.find(c => c.id === activeCategory) || menuData[0];
        category.items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'menu-item';

            const controls = document.createElement('div');
            controls.className = 'quantity-controls';

            const minus = document.createElement('button');
            minus.className = 'minus';
            minus.textContent = '-';
            minus.addEventListener('click', () => changeQuantity(item.name, item.price, -1));

            const span = document.createElement('span');
            span.id = `quantity-${item.name}`;

            const plus = document.createElement('button');
            plus.className = 'plus';
            plus.textContent = '+';
            plus.addEventListener('click', () => changeQuantity(item.name, item.price, 1));

            // Preserve quantity from cart if present
            const cartItem = cart.find(ci => ci.name === item.name);
            const q = cartItem ? cartItem.quantity : 0;
            span.textContent = String(q);

            // Set zero class and minus visibility according to preserved quantity
            if (q === 0) {
                span.classList.add('zero');
                minus.classList.add('minus-hidden');
            } else {
                span.classList.remove('zero');
                minus.classList.remove('minus-hidden');
                // Restore added state (badge + class)
                card.classList.add('added');
                const badge = document.createElement('div');
                badge.className = 'added-badge';
                badge.setAttribute('aria-hidden', 'true');
                badge.textContent = '✅';
                card.appendChild(badge);
            }

            controls.appendChild(minus);
            controls.appendChild(span);
            controls.appendChild(plus);

            const title = document.createElement('strong');
            title.textContent = item.name;
            const priceText = document.createTextNode(` - R$ ${item.price.toFixed(2)}`);

            card.appendChild(controls);
            card.appendChild(title);
            card.appendChild(priceText);

            menu.appendChild(card);
        });

        // After rendering, ensure controls initial state is set
        initQuantityControls();
    }