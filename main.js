const SHEET_URL = "https://script.google.com/macros/s/AKfycbxcLKKg25g_VElXLI9OzIxYGyJcQW9pRcQ2rw9iGjd92S9lNRPpa5n7xPazOEUjWQRA/exec";
let products = [], cart = [], currentPage = 1;
const itemsPerPage = 10;

document.addEventListener("DOMContentLoaded", () => { loadProducts(); setupEventListeners(); });

async function loadProducts() {
  try {
    const response = await fetch(SHEET_URL);
    products = await response.json();
    renderProducts();
    updateProductCount();
  } catch (e) { console.error("Error al cargar productos:", e); }
}
function setupEventListeners() {
  document.getElementById("applyFilters").addEventListener("click", applyFilters);
  document.getElementById("resetFilters").addEventListener("click", resetFilters);
  document.getElementById("refreshCatalog").addEventListener("click", loadProducts);
  document.getElementById("generateOrder").addEventListener("click", generateOrder);
  document.getElementById("clearCart").addEventListener("click", clearCart);
  document.getElementById("confirmAddToCart").addEventListener("click", addToCart);
}
function renderProducts(filtered = products) {
  const tbody = document.getElementById("productsTableBody");
  tbody.innerHTML = "";
  const start = (currentPage - 1) * itemsPerPage;
  const end = Math.min(start + itemsPerPage, filtered.length);
  const current = filtered.slice(start, end);
  if (current.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center">No hay productos</td></tr>`;
    return;
  }
  current.forEach(p => {
    const stockClass = p["Stock Actual"] == 0 ? "bg-danger" : p["Stock Actual"] < 10 ? "bg-warning" : "bg-success";
    tbody.innerHTML += `<tr><td>${p.idinventario}</td><td>${p.Descripción}</td>
    <td><span class="badge ${stockClass}">${p["Stock Actual"]}</span></td>
    <td>$${parseFloat(p["Precio de venta"]).toFixed(2)}</td>
    <td><button class="btn btn-sm btn-outline-primary" data-id="${p.idinventario}" data-desc="${p.Descripción}" 
    data-price="${p["Precio de venta"]}" data-stock="${p["Stock Actual"]}" onclick="openAddToCartModal(this)">Agregar</button></td></tr>`;
  });
  renderPagination(filtered.length);
}
function renderPagination(total) {
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";
  const pages = Math.ceil(total / itemsPerPage);
  for (let i = 1; i <= pages; i++) {
    pagination.innerHTML += `<li class="page-item ${currentPage === i ? "active" : ""}"><a href="#" class="page-link" onclick="goToPage(${i}); return false;">${i}</a></li>`;
  }
}
function goToPage(n){currentPage=n;renderProducts();}
function applyFilters(){
  const term=document.getElementById("searchInput").value.toLowerCase();
  const stock=document.getElementById("stockFilter").value;
  let filtered=products;
  if(term)filtered=filtered.filter(p=>p.Descripción.toLowerCase().includes(term));
  if(stock==="available")filtered=filtered.filter(p=>p["Stock Actual"]>0);
  else if(stock==="low")filtered=filtered.filter(p=>p["Stock Actual"]<10&&p["Stock Actual"]>0);
  else if(stock==="out")filtered=filtered.filter(p=>p["Stock Actual"]==0);
  currentPage=1;renderProducts(filtered);updateProductCount(filtered.length);
}
function resetFilters(){document.getElementById("searchInput").value="";document.getElementById("stockFilter").value="all";renderProducts();updateProductCount();}
function updateProductCount(count=products.length){document.getElementById("productCount").textContent=`${count} productos`;}

function openAddToCartModal(btn){
  document.getElementById("productId").value=btn.dataset.id;
  document.getElementById("productDescription").value=btn.dataset.desc;
  document.getElementById("productPrice").value=`$${parseFloat(btn.dataset.price).toFixed(2)}`;
  document.getElementById("productStock").value=btn.dataset.stock;
  document.getElementById("quantity").max=btn.dataset.stock;
  document.getElementById("quantity").value=1;
  document.getElementById("sellerName").value="";
  new bootstrap.Modal(document.getElementById("addToCartModal")).show();
}
function addToCart(){
  const id=document.getElementById("productId").value;
  const desc=document.getElementById("productDescription").value;
  const price=parseFloat(document.getElementById("productPrice").value.replace("$",""));
  const qty=parseInt(document.getElementById("quantity").value);
  const seller=document.getElementById("sellerName").value;
  if(!seller){alert("Ingrese el nombre del vendedor.");return;}
  const existing=cart.find(i=>i.id===id);
  if(existing)existing.qty+=qty;else cart.push({id,desc,price,qty,total:price*qty,seller});
  updateCartDisplay();bootstrap.Modal.getInstance(document.getElementById("addToCartModal")).hide();
}
function updateCartDisplay(){
  const c=document.getElementById("cartItems");
  if(cart.length===0){c.innerHTML='<p class="text-muted">No hay productos en el carrito</p>';
  document.getElementById("generateOrder").disabled=true;document.getElementById("clearCart").disabled=true;return;}
  let html="",total=0;
  cart.forEach(i=>{html+=`<div class='d-flex justify-content-between border-bottom mb-2 p-1'><div><small>${i.desc}</small><br><small>${i.qty} x $${i.price.toFixed(2)}</small></div><div><small>$${i.total.toFixed(2)}</small></div></div>`;total+=i.total;});
  html+=`<div class='fw-bold d-flex justify-content-between mt-2'><span>Total:</span><span>$${total.toFixed(2)}</span></div>`;
  c.innerHTML=html;document.getElementById("generateOrder").disabled=false;document.getElementById("clearCart").disabled=false;
}
function clearCart(){cart=[];updateCartDisplay();}
async function generateOrder(){
  if(cart.length===0)return;
  const today=new Date().toLocaleDateString("es-ES");
  const correlativo=`TG-${Date.now().toString().slice(-7)}`;
  const seller=cart[0].seller;
  const body=cart.map(i=>({Fecha:today,Descripcion:i.desc,cantidad:i.qty,Precio:i.price,Total:i.total,"nombre del vendedor":seller,Correlativo:correlativo}));
  try{
    await fetch(SHEET_URL,{method:"POST",body:JSON.stringify(body),headers:{"Content-Type":"application/json"}});
    alert(`Pedido ${correlativo} guardado correctamente en Sheets.`);clearCart();
  }catch(e){console.error("Error al guardar pedido:",e);}
}
