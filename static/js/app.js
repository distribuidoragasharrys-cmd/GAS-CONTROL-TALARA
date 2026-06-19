const currency = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

const gasProducts = new Set([
  "BALON DE GAS 10 KG",
  "CARGA DE GAS 10 KG",
  "BALON DE GAS 45 KG",
  "CARGA DE GAS 45 KG",
]);

function formatSoles(value) {
  return currency.format(Math.abs(value || 0)).replace("PEN", "S/");
}

function formatSignedSoles(value) {
  const sign = value < 0 ? "-" : "";
  return `${sign}${formatSoles(value)}`;
}

function numberFromInput(selector) {
  const input = document.querySelector(selector);
  if (!input) {
    return 0;
  }
  return Number.parseFloat(String(input.value || "0").replace(",", ".")) || 0;
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) {
    element.textContent = value;
  }
}

function canViewFinancial() {
  return window.dashboardData?.permissions?.can_view_financial === true;
}

function renderSummary(data) {
  if (canViewFinancial()) {
    setText("#incomeToday", formatSoles(data.metrics.income_today));
    setText("#expenseToday", formatSoles(data.metrics.expense_today));
    setText("#profitToday", formatSignedSoles(data.metrics.profit_today));
  }
  setText("#stockCurrent", data.metrics.stock);
  setText("#opOrdersPending", data.metrics.orders_pending);
  setText("#salesTodaySmall", `${data.metrics.orders_pending} pendientes - ${data.metrics.orders_delivered} entregados`);
  setText("#loanedSmall", `${data.metrics.loaned_total} balones prestados`);
  setText("#todayLabel", data.date_label);
}

function renderInventory(data) {
  setText("#inventoryFull", data.inventory.llenos);
  setText("#inventoryEmpty", data.inventory.vacios);
  setText("#inventoryIn", data.inventory.entradas_mes);
  setText("#inventoryOut", data.inventory.salidas_mes);
  setText("#inventoryInSmall", data.inventory.entradas_mes);
  setText("#gasStockBefore", data.inventory.llenos);
  setText("#inventoryLoanClients", data.inventory.prestados_clientes);
  setText("#inventoryLoanWholesalers", data.inventory.prestados_mayoristas);

  const fields = ["llenos", "vacios", "prestados_clientes", "prestados_mayoristas", "entradas_mes", "salidas_mes"];
  fields.forEach((field) => {
    const input = document.querySelector(`#${field}`);
    if (input && document.activeElement !== input) {
      input.value = data.inventory[field];
    }
  });
}

function renderWaterInventory(water) {
  setText("#waterFull", water.llenos);
  setText("#waterEmpty", water.vacios);
  setText("#waterIn", water.entradas_mes);
  setText("#waterOut", water.salidas_mes);
  const fields = {
    agua_llenos: water.llenos,
    agua_vacios: water.vacios,
    agua_entradas_mes: water.entradas_mes,
    agua_salidas_mes: water.salidas_mes,
  };
  Object.entries(fields).forEach(([field, value]) => {
    const input = document.querySelector(`#${field}`);
    if (input && document.activeElement !== input) {
      input.value = value;
    }
  });

  const list = document.querySelector("#waterMovementsList");
  if (!list) {
    return;
  }
  if (!water.movements.length) {
    list.innerHTML = '<div class="empty-chart">Sin movimientos de agua.</div>';
    return;
  }
  list.innerHTML = water.movements.map((item) => `
    <div class="mini-row">
      <span>${item.tipo}</span>
      <strong>${item.llenos >= 0 ? "+" : ""}${item.llenos} llenos</strong>
      <small>${item.referencia || item.fecha}</small>
    </div>
  `).join("");
}

function renderMovements(movements) {
  const table = document.querySelector("#movementsTable");
  if (!table) {
    return;
  }

  if (!movements.length) {
    table.innerHTML = '<tr><td class="empty-row" colspan="8">Aun no hay movimientos registrados para esta fecha.</td></tr>';
    return;
  }

  table.innerHTML = movements.map((item) => {
    const isIncome = item.amount > 0;
    const amountClass = isIncome ? "positive" : "negative";
    const badgeClass = isIncome ? "income" : "expense";

    return `
      <tr>
        <td>${item.date}</td>
        <td>${item.concept}</td>
        <td><span class="badge ${badgeClass}">${item.type}</span></td>
        <td>${item.driver || "-"}</td>
        <td class="amount ${amountClass}">${formatSignedSoles(item.amount)}</td>
        <td class="amount positive">${formatSoles(item.profit)}</td>
        <td>${item.note || "-"}</td>
        <td>${actionButtons(item.source_type, item.id, item.source_type === "pedido")}</td>
      </tr>
    `;
  }).join("");
}

function iconSvg(type) {
  if (type === "delete") {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="m9 10 .5 9"></path><path d="m15 10-.5 9"></path><path d="M5 6l1 15h12l1-15"></path></svg>';
  }
  if (type === "cancel") {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>';
  }
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>';
}

function actionButtons(type, id, cancelOnly = false) {
  if (!type || !id || type === "prestamo" || type === "fise") {
    return "-";
  }
  const deleteLabel = type === "pedido" || cancelOnly ? "Anular" : "Eliminar";
  const deleteType = type === "pedido" || cancelOnly ? "cancel" : "delete";
  return `
    <span class="row-actions">
      <button class="action-button" type="button" title="Editar" data-edit-type="${type}" data-id="${id}">${iconSvg("edit")}</button>
      <button class="action-button ${deleteType === "cancel" ? "warn" : "danger"}" type="button" title="${deleteLabel}" data-delete-type="${type}" data-id="${id}">${iconSvg(deleteType)}</button>
    </span>
  `;
}

function renderOrders(orders) {
  setText("#ordersPending", orders.counts.pendiente || 0);
  setText("#ordersRoute", orders.counts.en_ruta || 0);
  setText("#ordersDelivered", orders.counts.entregado || 0);
  setText("#ordersSettled", orders.counts.liquidado || 0);
  setText("#ordersCancelled", orders.counts.anulado || 0);
  setText("#ordersRouteSmall", orders.counts.en_ruta || 0);
  setText("#ordersDeliveredSmall", orders.counts.entregado || 0);

  const table = document.querySelector("#ordersTable");
  if (!table) {
    return;
  }
  const statusFilter = document.querySelector("#orderFilterStatus")?.value || "";
  const driverFilter = (document.querySelector("#orderFilterDriver")?.value || "").toLowerCase();
  const dateFilter = document.querySelector("#orderFilterDate")?.value || "";
  const filtered = orders.latest.filter((item) => {
    const matchesStatus = !statusFilter || item.estado === statusFilter;
    const matchesDriver = !driverFilter || String(item.repartidor || "").toLowerCase().includes(driverFilter);
    const matchesDate = !dateFilter || item.fecha_iso === dateFilter;
    return matchesStatus && matchesDriver && matchesDate;
  });

  if (!filtered.length) {
    table.innerHTML = '<tr><td class="empty-row" colspan="8">No hay pedidos con esos filtros.</td></tr>';
    return;
  }

  table.innerHTML = filtered.map((item) => `
    <tr>
      <td>#${item.id}</td>
      <td>${escapeHtml(item.cliente)}</td>
      <td class="compact-address">${escapeHtml(item.direccion)}</td>
      <td>${escapeHtml(item.items_resumen || item.producto || "-")}</td>
      <td class="amount">${formatSoles(item.total_venta || ((item.precio_venta || 0) * (item.cantidad || 0)))}</td>
      <td><span class="status-badge ${item.estado}">${item.estado_label}</span></td>
      <td>${escapeHtml(item.repartidor || "-")}</td>
      <td>${canViewFinancial() ? actionButtons("pedido", item.id, true) : "-"}</td>
    </tr>
  `).join("");
}

function renderQuickOrderOptions(orders) {
  const select = document.querySelector("#gestionPedido");
  if (!select) {
    return;
  }
  const currentValue = select.value;
  const options = orders.latest
    .filter((pedido) => ["pendiente", "en_ruta", "entregado"].includes(pedido.estado))
    .map((pedido) => {
      const total = pedido.total_venta || ((pedido.precio_venta || 0) * (pedido.cantidad || 0));
      const selected = String(pedido.id) === String(currentValue) ? "selected" : "";
      return `<option value="${pedido.id}" data-total="${total}" data-repartidor="${escapeHtml(pedido.repartidor || "")}" data-estado="${pedido.estado}" ${selected}>#${pedido.id} - ${escapeHtml(pedido.cliente)} / ${escapeHtml(pedido.items_resumen || pedido.producto || "")}</option>`;
    })
    .join("");
  select.innerHTML = `<option value="" data-total="0" data-efectivo="0">Seleccionar pedido</option>${options}`;
  if (![...select.options].some((option) => option.value === currentValue)) {
    select.value = "";
  }
  updateOrderLiquidationPreview();
}

function renderDrivers(drivers) {
  const table = document.querySelector("#driversTable");
  if (!table) {
    return;
  }

  if (!drivers.length) {
    table.innerHTML = '<tr><td class="empty-row" colspan="10">Aun no hay ventas o entregas de repartidores para esta fecha.</td></tr>';
    return;
  }

  table.innerHTML = drivers.map((item) => {
    const differenceClass = item.diferencia >= 0 ? "positive" : "negative";

    return `
      <tr>
        <td>${item.driver}</td>
        <td class="amount positive">${formatSoles(item.total_vendido)}</td>
        <td class="amount">${formatSoles(item.total_cobrado)}</td>
        <td class="amount negative">${formatSoles(item.total_pendiente)}</td>
        <td class="amount">${formatSoles(item.debe_entregar)}</td>
        <td class="amount positive">${formatSoles(item.dinero_entregado)}</td>
        <td class="amount ${differenceClass}">${formatSignedSoles(item.diferencia)}</td>
        <td class="amount positive">${formatSoles(item.ganancia)}</td>
        <td>
          <small>F20: ${item.fise_20_cantidad || 0} | F43: ${item.fise_43_cantidad || 0}</small><br>
          <small>FISE ${formatSoles(item.total_fise_valor || 0)} | Vuelto ${formatSoles(item.vuelto_yape || 0)}</small>
        </td>
        <td>${actionButtons("repartidor", item.id)}</td>
      </tr>
    `;
  }).join("");
}

function renderPaymentSummary(payment) {
  if (!canViewFinancial() || !document.querySelector("#paymentCash")) {
    return;
  }
  setText("#paymentCash", formatSoles(payment.efectivo));
  setText("#paymentYape", formatSoles(payment.yape));
  setText("#paymentYapeMarcos", formatSoles(payment.yape_marcos));
  setText("#paymentPlin", formatSoles(payment.plin));
  setText("#paymentFise", formatSoles(payment.fise));
  setText("#paymentCredit", formatSoles(payment.fiado));
  setText("#paymentYapeChange", formatSoles(payment.vuelto_yape || 0));
  setText("#paymentTotal", formatSoles(payment.total));
  setText("#paymentStatus", payment.cuadre ? "Correcto" : "Revisar");
}

function renderCreditClients(items) {
  const table = document.querySelector("#creditClientsTable");
  if (!table) {
    return;
  }
  const clientFilter = (document.querySelector("#creditFilterClient")?.value || "").toLowerCase();
  const dateFilter = document.querySelector("#creditFilterDate")?.value || "";
  const driverFilter = (document.querySelector("#creditFilterDriver")?.value || "").toLowerCase();
  const statusFilter = document.querySelector("#creditFilterStatus")?.value || "";
  const filtered = items.filter((item) => {
    const matchesClient = !clientFilter || String(item.cliente || "").toLowerCase().includes(clientFilter);
    const matchesDate = !dateFilter || item.fecha_iso === dateFilter;
    const matchesDriver = !driverFilter || String(item.repartidor || "").toLowerCase().includes(driverFilter);
    const matchesStatus = !statusFilter || item.estado === statusFilter;
    return matchesClient && matchesDate && matchesDriver && matchesStatus;
  });

  if (!filtered.length) {
    table.innerHTML = '<tr><td class="empty-row" colspan="9">Sin clientes fiados con esos filtros.</td></tr>';
    return;
  }

  table.innerHTML = filtered.map((item) => `
    <tr class="${item.estado === "Fiado pendiente" ? "debt-pending-row" : ""}">
      <td>${escapeHtml(item.cliente || "-")}</td>
      <td class="compact-address">${escapeHtml(item.direccion || "-")}</td>
      <td>${escapeHtml(item.telefono || "-")}</td>
      <td>${escapeHtml(item.fecha || "-")}</td>
      <td>${escapeHtml(item.repartidor || "-")}</td>
      <td class="amount ${item.monto > 0 ? "negative" : "positive"}">${formatSoles(item.monto || 0)}</td>
      <td>${item.dias_atraso || 0}</td>
      <td><span class="status-badge ${item.estado === "Fiado pendiente" ? "pendiente" : "liquidado"}">${escapeHtml(item.estado)}</span></td>
      <td>
        ${item.monto > 0 ? `<button class="action-button text-action" type="button" data-credit-pay="${item.id}">Liquidar deuda</button>` : `<small>${escapeHtml(item.historial || "Liquidado")}</small>`}
      </td>
    </tr>
  `).join("");
}

function renderFiseLiquidation(report) {
  const table = document.querySelector("#fiseLiquidationTable");
  if (!table) {
    return;
  }
  const items = report?.items || [];
  if (!items.length) {
    table.innerHTML = '<tr><td class="empty-row" colspan="8">Sin FISES fisicos pendientes para esta fecha.</td></tr>';
    return;
  }

  table.innerHTML = items.map((item) => {
    const pending = item.pendiente_total || 0;
    const deliveredAt = item.entregado_at ? `<small>Entregado: ${escapeHtml(item.entregado_at)}</small>` : "";
    return `
      <tr>
        <td>${escapeHtml(item.repartidor)}</td>
        <td>${escapeHtml(item.fecha)}</td>
        <td>${item.pendiente_20}</td>
        <td>${item.pendiente_43}</td>
        <td>${pending}</td>
        <td class="amount">${formatSoles(item.pendiente_valor || 0)}</td>
        <td><span class="status-badge ${pending > 0 ? "pendiente" : "liquidado"}">${escapeHtml(item.estado)}</span>${deliveredAt}</td>
        <td>
          ${pending > 0 ? `
            <form class="inline-action-form" method="post" action="/fises-liquidacion/entregar">
              <input type="hidden" name="fecha" value="${escapeHtml(item.fecha_iso)}">
              <input type="hidden" name="repartidor_id" value="${item.repartidor_id}">
              <input type="hidden" name="cantidad_20" value="${item.pendiente_20}">
              <input type="hidden" name="cantidad_43" value="${item.pendiente_43}">
              <button class="action-button text-action" type="submit">Marcar como entregado</button>
            </form>
          ` : "-"}
        </td>
      </tr>
    `;
  }).join("");
}

function renderProductSummary(summary) {
  const productList = document.querySelector("#productSalesList");
  const valveList = document.querySelector("#valveSalesList");
  if (!canViewFinancial() || !productList || !valveList) {
    return;
  }

  if (!summary.products.length) {
    productList.innerHTML = '<div class="empty-chart">Sin ventas por producto.</div>';
  } else {
    productList.innerHTML = summary.products.map((item) => `
      <div class="mini-row">
        <span>${item.producto}</span>
        <strong>${formatSoles(item.ventas)}</strong>
        <small>${item.cantidad} unidades - Ganancia ${formatSignedSoles(item.ganancia)}</small>
      </div>
    `).join("");
  }

  if (!summary.valves.length) {
    valveList.innerHTML = '<div class="empty-chart">Sin ventas de gas con valvula.</div>';
  } else {
    valveList.innerHTML = summary.valves.map((item) => `
      <div class="mini-row">
        <span>${item.tipo_valvula}</span>
        <strong>${formatSoles(item.ventas)}</strong>
        <small>${item.cantidad} unidades</small>
      </div>
    `).join("");
  }
}

function renderAccounts(summary) {
  const list = document.querySelector("#accountsList");
  if (!canViewFinancial() || !list) {
    return;
  }
  setText("#accountBalanceTotal", formatSignedSoles(summary.saldo_total));
  setText("#accountInitialTotal", formatSoles(summary.saldo_inicial_total));
  setText("#accountIncomeMovements", formatSoles(summary.ingresos));
  setText("#accountExpenseMovements", formatSoles(summary.egresos));
  setText("#accountCurrentTotal", formatSignedSoles(summary.saldo_total));

  const maxFlow = Math.max(summary.ingresos, summary.egresos, 1);
  const incomeBar = document.querySelector("#accountIncomeBar");
  const expenseBar = document.querySelector("#accountExpenseBar");
  if (incomeBar) {
    incomeBar.style.width = `${Math.round((summary.ingresos / maxFlow) * 100)}%`;
  }
  if (expenseBar) {
    expenseBar.style.width = `${Math.round((summary.egresos / maxFlow) * 100)}%`;
  }

  if (!summary.accounts.length) {
    list.innerHTML = '<div class="empty-chart">Sin cuentas registradas.</div>';
    return;
  }

  list.innerHTML = summary.accounts.map((account) => {
    const balanceClass = account.saldo_actual >= 0 ? "positive" : "negative";
    return `
      <div class="account-row">
        <span>${account.nombre}</span>
        <small>Inicial ${formatSoles(account.saldo_inicial)} - Mov. ${formatSignedSoles(account.movimientos)}</small>
        <strong class="${balanceClass}">${formatSignedSoles(account.saldo_actual)}</strong>
      </div>
    `;
  }).join("");
}

function renderStockControl(stock) {
  if (!document.querySelector("#stockStart")) {
    return;
  }
  setText("#stockStart", stock.inicio_llenos ?? "Sin registro");
  setText("#stockSales", stock.ventas);
  setText("#stockLoans", stock.prestamos_llenos);
  setText("#stockFinal", stock.stock_final ?? "-");
  setText("#stockCurrentCheck", stock.inventario_actual);
  setText("#stockStatus", stock.cuadra ? "Cuadra" : "Revisar");
}

function renderLoans(loans) {
  const list = document.querySelector("#loansList");
  if (!list) {
    return;
  }
  setText("#loanedClients", loans.clientes);
  setText("#loanedWholesalers", loans.mayoristas);

  if (!loans.latest.length) {
    list.innerHTML = '<div class="empty-chart">Sin prestamos pendientes.</div>';
    return;
  }

  list.innerHTML = loans.latest.map((item) => `
    <div class="mini-row">
      <span>${item.cliente}</span>
      <strong>${item.pendiente} ${item.tipo_balon}</strong>
      <small>${item.fecha} - ${item.tipo_cliente}</small>
    </div>
  `).join("");
}

function renderPriceHistory(prices) {
  const list = document.querySelector("#priceHistoryList");
  if (!list) {
    return;
  }

  if (!prices.length) {
    list.innerHTML = '<div class="empty-chart">Aun no hay precios registrados.</div>';
    return;
  }

  list.innerHTML = prices.map((item) => `
    <div class="mini-row">
      <span>${item.fecha}</span>
      <strong>${formatSoles(item.precio_venta)}</strong>
      <small>Costo ${formatSoles(item.costo_balon)}</small>
    </div>
  `).join("");
}

function renderLiquidationHistory(items) {
  const list = document.querySelector("#liquidationHistoryList");
  if (!canViewFinancial() || !list) {
    return;
  }

  if (!items.length) {
    list.innerHTML = '<div class="empty-chart">Sin entregas registradas.</div>';
    return;
  }

  list.innerHTML = items.map((item) => {
    const differenceClass = item.diferencia >= 0 ? "positive" : "negative";
    return `
      <div class="mini-row">
        <span>${item.repartidor}${item.cliente ? ` - ${item.cliente}` : ""}</span>
        <strong class="${differenceClass}">${formatSignedSoles(item.diferencia)}</strong>
        <small>Debe ${formatSoles(item.debe_entregar)} - Entrego ${formatSoles(item.entregado)}</small>
        <div class="mini-actions">${actionButtons("liquidacion", item.id)}</div>
      </div>
    `;
  }).join("");
}

function renderFiseReport(report) {
  setText("#fise20Count", report.cantidad_20 || 0);
  setText("#fise43Count", report.cantidad_43 || 0);
  setText("#fiseCount", report.cantidad || 0);
  setText("#fiseTotal", formatSoles(report.total || 0));
  const list = document.querySelector("#fiseHistoryList");
  if (!list) {
    return;
  }
  if (!report.items.length) {
    list.innerHTML = '<div class="empty-chart">Sin FISES registrados.</div>';
    return;
  }
  list.innerHTML = report.items.map((item) => `
      <div class="mini-row">
        <span>${item.repartidor}</span>
        <strong>${formatSoles(item.total_fise)}</strong>
      <small>S/20: ${item.cantidad_20 || 0} - S/43: ${item.cantidad_43 || 0} - Total: ${item.cantidad} FISES${item.observaciones ? ` - ${item.observaciones}` : ""}</small>
    </div>
  `).join("");
}

function renderInventoryMovements(items) {
  const list = document.querySelector("#inventoryMovementsList");
  if (!list) {
    return;
  }
  if (!items.length) {
    list.innerHTML = '<div class="empty-chart">Sin movimientos de gas.</div>';
    return;
  }
  list.innerHTML = items.map((item) => `
    <div class="mini-row">
      <span>${item.tipo}</span>
      <strong>${item.llenos >= 0 ? "+" : ""}${item.llenos} llenos</strong>
      <small>${item.referencia || item.fecha}</small>
    </div>
  `).join("");
}

function renderAccountMovements(items) {
  const list = document.querySelector("#accountMovementsList");
  if (!canViewFinancial() || !list) {
    return;
  }

  if (!items.length) {
    list.innerHTML = '<div class="empty-chart">Sin movimientos de cuentas.</div>';
    return;
  }

  list.innerHTML = items.map((item) => {
    const signedAmount = item.tipo === "egreso" ? -item.monto : item.monto;
    const amountClass = signedAmount >= 0 ? "positive" : "negative";
    return `
      <div class="mini-row">
        <span>${item.cuenta}</span>
        <strong class="${amountClass}">${formatSignedSoles(signedAmount)}</strong>
        <small>${item.referencia || item.tipo}</small>
      </div>
    `;
  }).join("");
}

function renderSalesChart(sales) {
  const chart = document.querySelector("#salesChart");
  if (!canViewFinancial() || !chart) {
    return;
  }
  const maxValue = Math.max(...sales.map((item) => item.value), 1);
  const axis = ["S/ 20k", "S/ 15k", "S/ 10k", "S/ 5k"]
    .map((label) => `<span class="chart-axis">${label}</span>`)
    .join("");

  const bars = sales.map((item, index) => {
    const height = Math.round((item.value / maxValue) * 170);
    return `
      <div class="bar-item" style="grid-column: ${index + 2}">
        <span class="bar" style="height: ${height}px" title="${formatSoles(item.value)}"></span>
        <span class="bar-label">${item.day}</span>
      </div>
    `;
  }).join("");

  chart.innerHTML = `${axis}${bars}`;
}

function renderExpenseLegend(categories, total) {
  const legend = document.querySelector("#expenseLegend");
  const donut = document.querySelector("#expenseDonut");
  if (!canViewFinancial() || !legend || !donut) {
    return;
  }
  setText("#expenseTotal", formatSoles(total));

  if (!categories.length) {
    legend.innerHTML = '<div class="empty-chart">Sin gastos registrados este mes.</div>';
    donut.style.background = "radial-gradient(circle closest-side, #fff 0 46%, transparent 47%), conic-gradient(#dbe4ee 0 100%)";
    return;
  }

  let current = 0;
  const segments = categories.map((item) => {
    const percent = total ? (item.amount / total) * 100 : 0;
    const start = current;
    current += percent;
    return `${item.color} ${start}% ${current}%`;
  });

  donut.style.background = `radial-gradient(circle closest-side, #fff 0 46%, transparent 47%), conic-gradient(${segments.join(", ")})`;
  legend.innerHTML = categories.map((item) => `
    <div class="legend-row">
      <span class="legend-dot" style="background:${item.color}"></span>
      <span>${item.label}</span>
      <span class="legend-money">${formatSoles(item.amount)}</span>
      <span class="legend-percent">${item.percent}</span>
    </div>
  `).join("");
}

function renderMonthSummary(summary) {
  if (!canViewFinancial() || !document.querySelector("#monthIncome")) {
    return;
  }
  setText("#monthIncome", formatSoles(summary.income));
  setText("#monthExpense", formatSoles(summary.expense));
  setText("#monthGrossProfit", formatSignedSoles(summary.gross_profit));
  setText("#monthProfit", formatSignedSoles(summary.profit));
  setText("#monthSales", summary.sales_count);
  setText("#monthClients", summary.clients_count);
}

function renderDashboard(data) {
  renderSummary(data);
  renderOrders(data.orders);
  renderQuickOrderOptions(data.orders);
  renderInventory(data);
  renderWaterInventory(data.water_inventory);
  renderMovements(data.movements);
  renderDrivers(data.driver_summary);
  renderPaymentSummary(data.payment_summary);
  renderCreditClients(data.credit_clients || []);
  renderFiseLiquidation(data.fise_liquidation || {});
  renderProductSummary(data.product_summary);
  renderAccounts(data.account_summary);
  renderLiquidationHistory(data.liquidation_history);
  renderFiseReport(data.fise_report);
  renderInventoryMovements(data.inventory_movements);
  renderAccountMovements(data.account_movements);
  renderStockControl(data.stock_control);
  renderLoans(data.loans);
  renderPriceHistory(data.price_history);
  renderSalesChart(data.sales_chart);
  renderExpenseLegend(data.expense_categories, data.expense_total);
  renderMonthSummary(data.month_summary);
  updateLiquidationPreview();
  updateOrderLiquidationPreview();
}

function selectedDate() {
  const params = new URLSearchParams(window.location.search);
  return params.get("fecha") || window.dashboardData.selected_date;
}

async function refreshDashboard() {
  try {
    const response = await fetch(`/api/dashboard?fecha=${encodeURIComponent(selectedDate())}`, {
      headers: { "Accept": "application/json" },
    });
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    window.dashboardData = data;
    renderDashboard(data);
  } catch (error) {
    console.warn("No se pudo actualizar el dashboard.", error);
  }
}

function setupMobileMenu() {
  const shell = document.querySelector(".app-shell");
  const menuButton = document.querySelector(".menu-button");
  const navLinks = document.querySelectorAll(".nav-link, .logout");

  menuButton.addEventListener("click", () => {
    shell.classList.toggle("nav-open");
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => shell.classList.remove("nav-open"));
  });
}

function setupSaleCalculator() {
  const inputs = document.querySelectorAll(".sale-calculator");
  const totalPreview = document.querySelector("#saleTotalPreview");
  const profitPreview = document.querySelector("#saleProfitPreview");
  const pendingPreview = document.querySelector("#salePendingPreview");
  if (!inputs.length || !totalPreview || !profitPreview || !pendingPreview) {
    return;
  }

  function updatePreview() {
    const quantity = numberFromInput("#cantidad");
    const cost = numberFromInput("#costo_balon");
    const price = numberFromInput("#precio_venta");
    const cash = numberFromInput("#pago_efectivo");
    const yape = numberFromInput("#pago_yape");
    const yapeMarcos = numberFromInput("#pago_yape_marcos");
    const plin = numberFromInput("#pago_plin");
    const fise = numberFromInput("#pago_fise");
    const credit = numberFromInput("#pago_fiado");
    const total = quantity * price;
    const profit = total - (quantity * cost);
    const pending = total - cash - yape - yapeMarcos - plin - fise - credit;

    totalPreview.textContent = formatSoles(total);
    profitPreview.textContent = formatSignedSoles(profit);
    pendingPreview.textContent = formatSignedSoles(pending);
  }

  inputs.forEach((input) => input.addEventListener("input", updatePreview));
  updatePreview();
}

function updateNewOrderPreview() {
  const productInput = document.querySelector("#pedidoProducto");
  const valveGroup = document.querySelector("#pedidoValveGroup");
  const valveSelect = document.querySelector("#pedidoTipoValvula");
  const extraProductInput = document.querySelector("#pedidoProductoExtra");
  const extraValveGroup = document.querySelector("#pedidoValveExtraGroup");
  const extraValveSelect = document.querySelector("#pedidoTipoValvulaExtra");
  const totalPreview = document.querySelector("#newOrderTotalPreview");
  const profitPreview = document.querySelector("#newOrderProfitPreview");
  const typePreview = document.querySelector("#newOrderTypePreview");

  if (!productInput || !valveGroup || !totalPreview || !typePreview) {
    return;
  }

  const product = productInput.value;
  const isGas = gasProducts.has(product);
  valveGroup.style.display = isGas ? "" : "none";
  if (valveSelect) {
    valveSelect.disabled = !isGas;
  }
  const extraProduct = extraProductInput?.value || "";
  const hasExtra = Boolean(extraProduct);
  const isExtraGas = gasProducts.has(extraProduct);
  if (extraValveGroup) {
    extraValveGroup.style.display = hasExtra && isExtraGas ? "" : "none";
  }
  if (extraValveSelect) {
    extraValveSelect.disabled = !hasExtra || !isExtraGas;
  }

  const quantity = numberFromInput("#pedidoCantidad");
  const cost = numberFromInput("#pedidoCosto");
  const price = numberFromInput("#pedidoPrecio");
  const extraQuantity = hasExtra ? numberFromInput("#pedidoCantidadExtra") : 0;
  const extraCost = hasExtra ? numberFromInput("#pedidoCostoExtra") : 0;
  const extraPrice = hasExtra ? numberFromInput("#pedidoPrecioExtra") : 0;
  const total = (quantity * price) + (extraQuantity * extraPrice);
  const profit = ((price - cost) * quantity) + ((extraPrice - extraCost) * extraQuantity);

  totalPreview.textContent = formatSoles(total);
  if (profitPreview) {
    profitPreview.textContent = formatSignedSoles(profit);
  }
  typePreview.textContent = hasExtra ? "Mixto" : (isGas ? "Gas" : "Agua");
}

function setupNewOrderCalculator() {
  const inputs = document.querySelectorAll(".order-calculator");
  const valve = document.querySelector("#pedidoTipoValvula");
  inputs.forEach((input) => input.addEventListener("input", updateNewOrderPreview));
  inputs.forEach((input) => input.addEventListener("change", updateNewOrderPreview));
  if (valve) {
    valve.addEventListener("change", updateNewOrderPreview);
  }
  updateNewOrderPreview();
}

function updateLiquidationPreview() {
  const driverInput = document.querySelector("#pagoRepartidor");
  const amountInput = document.querySelector("#pagoMonto");
  const expectedPreview = document.querySelector("#driverExpectedPreview");
  const amountPreview = document.querySelector("#liquidationAmountPreview");
  const differencePreview = document.querySelector("#driverDifferencePreview");

  if (!driverInput || !amountInput || !expectedPreview || !amountPreview || !differencePreview) {
    return;
  }

  const cleanName = driverInput.value.trim().toLocaleLowerCase("es-PE");
  const driver = (window.dashboardData.driver_summary || []).find((item) => {
    return item.driver.trim().toLocaleLowerCase("es-PE") === cleanName;
  });
  const expected = driver ? driver.dinero_pendiente : 0;
  const amount = numberFromInput("#pagoMonto");
  const difference = amount - expected;

  expectedPreview.textContent = formatSoles(expected);
  amountPreview.textContent = formatSoles(amount);
  differencePreview.textContent = formatSignedSoles(difference);
  differencePreview.classList.toggle("positive", difference >= 0);
  differencePreview.classList.toggle("negative", difference < 0);
}

function setupDriverLiquidationPreview() {
  const driverInput = document.querySelector("#pagoRepartidor");
  const amountInput = document.querySelector("#pagoMonto");

  if (!driverInput || !amountInput) {
    return;
  }

  driverInput.addEventListener("input", updateLiquidationPreview);
  amountInput.addEventListener("input", updateLiquidationPreview);
  updateLiquidationPreview();
}

function updateOrderLiquidationPreview() {
  const orderSelect = document.querySelector("#gestionPedido");
  const actionSelect = document.querySelector("#gestionAccion");
  const totalPreview = document.querySelector("#orderTotalPreview");
  const collectedPreview = document.querySelector("#orderCollectedPreview");
  const pendingPreview = document.querySelector("#orderPendingPreview");
  const differencePreview = document.querySelector("#orderDifferencePreview");
  const fisePreview = document.querySelector("#orderFisePreview");
  const yapeChangePreview = document.querySelector("#orderYapeChangePreview");

  if (!orderSelect || !totalPreview || !collectedPreview || !pendingPreview || !differencePreview) {
    return;
  }

  const selectedOption = orderSelect.options[orderSelect.selectedIndex];
  const total = Number(selectedOption?.dataset?.total || 0);
  const driverInput = document.querySelector("#gestionRepartidor");
  if (driverInput && selectedOption?.dataset?.repartidor && document.activeElement !== driverInput) {
    driverInput.value = selectedOption.dataset.repartidor;
  }
  const cash = numberFromInput("#liq_pago_efectivo");
  const yape = numberFromInput("#liq_pago_yape");
  const yapeMarcos = numberFromInput("#liq_pago_yape_marcos");
  const plin = numberFromInput("#liq_pago_plin");
  const fise20 = numberFromInput("#liq_fise_20");
  const fise43 = numberFromInput("#liq_fise_43");
  const fiseByCount = (fise20 * 20) + (fise43 * 43);
  const fiseInput = document.querySelector("#liq_pago_fise");
  if (fiseInput && fiseByCount > 0 && document.activeElement !== fiseInput) {
    fiseInput.value = fiseByCount.toFixed(2);
  }
  const fise = fiseByCount > 0 ? fiseByCount : numberFromInput("#liq_pago_fise");
  const credit = numberFromInput("#liq_pago_fiado");
  const yapeChange = numberFromInput("#liq_vuelto_yape");
  const delivered = numberFromInput("#liq_dinero_entregado");
  const collected = cash + yape + yapeMarcos + plin + fise;
  const paid = collected + credit - yapeChange;
  const pending = total - paid;
  const difference = delivered - cash;
  const isLiquidation = !actionSelect || actionSelect.value === "liquidar";

  document.querySelectorAll(".liquidation-calculator").forEach((input) => {
    if (input.id !== "gestionPedido" && input.id !== "gestionAccion") {
      input.disabled = !isLiquidation;
    }
  });

  totalPreview.textContent = formatSoles(total);
  collectedPreview.textContent = formatSoles(collected);
  pendingPreview.textContent = formatSignedSoles(pending);
  differencePreview.textContent = formatSignedSoles(difference);
  if (fisePreview) {
    fisePreview.textContent = `${fise20 + fise43} / ${formatSoles(fise)}`;
  }
  if (yapeChangePreview) {
    yapeChangePreview.textContent = formatSoles(yapeChange);
  }
  differencePreview.classList.toggle("positive", difference >= 0);
  differencePreview.classList.toggle("negative", difference < 0);
}

function setupOrderLiquidationCalculator() {
  const inputs = document.querySelectorAll(".liquidation-calculator");
  inputs.forEach((input) => input.addEventListener("input", updateOrderLiquidationPreview));
  inputs.forEach((input) => input.addEventListener("change", updateOrderLiquidationPreview));
  updateOrderLiquidationPreview();
}

function setupFiseManualCalculator() {
  const fise20 = document.querySelector("#cantidadFise20");
  const fise43 = document.querySelector("#cantidadFise43");
  const cantidad = document.querySelector("#cantidadFise");
  const total = document.querySelector("#totalFise");
  if (!fise20 || !fise43 || !cantidad || !total) {
    return;
  }
  const update = () => {
    const qty20 = numberFromInput("#cantidadFise20");
    const qty43 = numberFromInput("#cantidadFise43");
    const count = qty20 + qty43;
    const amount = (qty20 * 20) + (qty43 * 43);
    if (count > 0) {
      cantidad.value = count;
      total.value = amount.toFixed(2);
    }
  };
  fise20.addEventListener("input", update);
  fise43.addEventListener("input", update);
  update();
}

function setupLiveFilters() {
  const filterIds = [
    "#orderFilterStatus",
    "#orderFilterDriver",
    "#orderFilterDate",
    "#creditFilterClient",
    "#creditFilterDate",
    "#creditFilterDriver",
    "#creditFilterStatus",
  ];
  filterIds.forEach((selector) => {
    const input = document.querySelector(selector);
    if (!input) {
      return;
    }
    const eventName = input.tagName === "SELECT" || input.type === "date" ? "change" : "input";
    input.addEventListener(eventName, () => {
      renderOrders(window.dashboardData.orders);
      renderCreditClients(window.dashboardData.credit_clients || []);
    });
  });
}

function setupGestionAjax() {
  const form = document.querySelector("#gestionPedidoForm");
  if (!form) {
    return;
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const scrollY = window.scrollY;
    const button = form.querySelector("button[type='submit']");
    if (button) {
      button.disabled = true;
      button.textContent = "Liquidando...";
    }
    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          "Accept": "application/json",
        },
      });
      const result = await response.json();
      if (!result.ok) {
        alert(result.message || "No se pudo liquidar el pedido.");
        return;
      }
      window.dashboardData = result.data;
      renderDashboard(result.data);
      form.reset();
      setText("#orderTotalPreview", formatSoles(0));
      window.scrollTo({ top: scrollY, behavior: "auto" });
    } catch (error) {
      alert("No se pudo liquidar el pedido. Revise la conexion local.");
      console.warn(error);
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Liquidar pedido";
      }
    }
  });
}

function selectedCreditPaymentTotal() {
  const form = document.querySelector("#creditPaymentForm");
  return Number(form?.dataset?.pending || 0);
}

function updateCreditPaymentPreview() {
  const totalPending = selectedCreditPaymentTotal();
  const fise20 = numberFromInput("#creditFise20");
  const fise43 = numberFromInput("#creditFise43");
  const fiseAmount = (fise20 * 20) + (fise43 * 43);
  const fiseInput = document.querySelector("#creditFise");
  if (fiseInput && fiseAmount > 0 && document.activeElement !== fiseInput) {
    fiseInput.value = fiseAmount.toFixed(2);
  }
  const cash = numberFromInput("#creditCash");
  const yape = numberFromInput("#creditYape");
  const transfer = numberFromInput("#creditTransfer");
  const fise = fiseAmount > 0 ? fiseAmount : numberFromInput("#creditFise");
  const paid = cash + yape + transfer + fise;
  const balance = totalPending - paid;

  setText("#creditPaymentAmountPreview", formatSoles(paid));
  setText("#creditPaymentBalancePreview", formatSignedSoles(balance));
  setText("#creditPaymentFisePreview", `${fise20 + fise43} / ${formatSoles(fise)}`);
  setText("#creditPaymentStatusPreview", balance <= 0 ? "Liquidado" : "Pendiente");
}

function setupCreditPaymentModal() {
  const modalElement = document.querySelector("#creditPaymentModal");
  const form = document.querySelector("#creditPaymentForm");
  if (!modalElement || !form) {
    return;
  }
  const modal = new bootstrap.Modal(modalElement);
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-credit-pay]");
    if (!button) {
      return;
    }
    const id = Number(button.dataset.creditPay);
    const record = (window.dashboardData.credit_clients || []).find((item) => item.id === id);
    if (!record) {
      return;
    }
    form.action = `/fiados/${id}/liquidar`;
    form.dataset.pending = String(record.monto || 0);
    form.reset();
    document.querySelector("#creditPaymentDate").value = window.dashboardData.selected_date;
    setText("#creditPaymentTitle", `Liquidar deuda #${id}`);
    setText("#creditPaymentClient", record.cliente || "-");
    setText("#creditPaymentPending", formatSoles(record.monto || 0));
    updateCreditPaymentPreview();
    modal.show();
  });

  document.querySelectorAll(".credit-payment-calculator").forEach((input) => {
    input.addEventListener("input", updateCreditPaymentPreview);
    input.addEventListener("change", updateCreditPaymentPreview);
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function fieldTemplate(name, label, value = "", type = "text", col = "col-sm-6", extra = "") {
  return `
    <div class="${col}" data-field="${name}">
      <label class="form-label" for="edit_${name}">${label}</label>
      <input class="form-control" id="edit_${name}" name="${name}" type="${type}" value="${escapeHtml(value)}" ${extra}>
    </div>
  `;
}

function selectTemplate(name, label, value, options, col = "col-sm-6") {
  const optionHtml = options.map((option) => {
    const selected = String(option.value) === String(value) ? "selected" : "";
    return `<option value="${escapeHtml(option.value)}" ${selected}>${escapeHtml(option.label)}</option>`;
  }).join("");
  return `
    <div class="${col}" data-field="${name}">
      <label class="form-label" for="edit_${name}">${label}</label>
      <select class="form-select" id="edit_${name}" name="${name}">${optionHtml}</select>
    </div>
  `;
}

function productSelectTemplate(value, col = "col-12") {
  return selectTemplate("producto", "Producto", value, [
    { value: "BALON DE GAS 10 KG", label: "BALON DE GAS 10 KG" },
    { value: "CARGA DE GAS 10 KG", label: "CARGA DE GAS 10 KG" },
    { value: "BALON DE GAS 45 KG", label: "BALON DE GAS 45 KG" },
    { value: "CARGA DE GAS 45 KG", label: "CARGA DE GAS 45 KG" },
    { value: "BIDON DE AGUA", label: "BIDON DE AGUA" },
    { value: "CARGA DE AGUA", label: "CARGA DE AGUA" },
  ], col);
}

function valveSelectTemplate(value, col = "col-sm-6") {
  return selectTemplate("tipo_valvula", "Valvula", value || "VALVULA NORMAL", [
    { value: "VALVULA NORMAL", label: "VALVULA NORMAL" },
    { value: "VALVULA PREMIUM", label: "VALVULA PREMIUM" },
  ], col);
}

function setupEditProductValveToggle() {
  const productSelect = document.querySelector("#edit_producto");
  const valveSelect = document.querySelector("#edit_tipo_valvula");
  const valveWrapper = document.querySelector('[data-field="tipo_valvula"]');
  if (!productSelect || !valveSelect || !valveWrapper) {
    return;
  }

  function updateValveVisibility() {
    const isGas = gasProducts.has(productSelect.value);
    valveWrapper.style.display = isGas ? "" : "none";
    valveSelect.disabled = !isGas;
  }

  productSelect.addEventListener("change", updateValveVisibility);
  updateValveVisibility();
}

function paymentFields(record = {}) {
  return [
    fieldTemplate("pago_efectivo", "Efectivo", record.pago_efectivo || 0, "number", "col-sm-4", 'min="0" step="0.01"'),
    fieldTemplate("pago_yape", "Yape", record.pago_yape || 0, "number", "col-sm-4", 'min="0" step="0.01"'),
    fieldTemplate("pago_yape_marcos", "Yape Marcos", record.pago_yape_marcos || 0, "number", "col-sm-4", 'min="0" step="0.01"'),
    fieldTemplate("pago_plin", "Plin", record.pago_plin || 0, "number", "col-sm-4", 'min="0" step="0.01"'),
    fieldTemplate("pago_fise", "FISE", record.pago_fise || 0, "number", "col-sm-4", 'min="0" step="0.01"'),
    fieldTemplate("pago_fiado", "Fiado", record.pago_fiado || 0, "number", "col-sm-4", 'min="0" step="0.01"'),
    fieldTemplate("pago_vuelto_yape", "Vuelto Yape", record.pago_vuelto_yape || record.vuelto_yape || 0, "number", "col-sm-4", 'min="0" step="0.01"'),
  ].join("");
}

function getRecord(type, id) {
  const data = window.dashboardData;
  const numberId = Number(id);
  if (type === "pedido") {
    return data.orders.latest.find((item) => item.id === numberId);
  }
  if (type === "venta") {
    return data.management.ventas.find((item) => item.id === numberId);
  }
  if (type === "gasto") {
    return data.management.gastos.find((item) => item.id === numberId);
  }
  if (type === "liquidacion") {
    return data.management.liquidaciones.find((item) => item.id === numberId);
  }
  if (type === "repartidor") {
    return data.management.repartidores.find((item) => item.id === numberId);
  }
  return null;
}

function fieldsForRecord(type, record) {
  if (type === "pedido") {
    return [
      fieldTemplate("fecha", "Fecha", record.fecha_iso || window.dashboardData.selected_date, "date"),
      fieldTemplate("cliente", "Cliente", record.cliente),
      fieldTemplate("telefono", "Telefono", record.telefono),
      fieldTemplate("direccion", "Direccion", record.direccion, "text", "col-12"),
      productSelectTemplate(record.producto),
      valveSelectTemplate(record.tipo_valvula),
      fieldTemplate("cantidad", "Cantidad", record.cantidad, "number", "col-sm-6", 'min="1" step="1"'),
      fieldTemplate("costo_producto", "Costo producto", record.costo_producto, "number", "col-sm-6", 'min="0" step="0.01"'),
      fieldTemplate("precio_venta", "Precio venta", record.precio_venta, "number", "col-sm-6", 'min="0" step="0.01"'),
      fieldTemplate("repartidor", "Repartidor", record.repartidor, "text", "col-sm-6", 'list="driversList"'),
      fieldTemplate("observaciones", "Observaciones", record.observaciones, "text", "col-12"),
    ].join("");
  }
  if (type === "venta") {
    return [
      fieldTemplate("fecha", "Fecha", record.fecha, "date"),
      fieldTemplate("cliente", "Cliente", record.cliente),
      fieldTemplate("repartidor", "Repartidor", record.repartidor, "text", "col-sm-6", 'list="driversList"'),
      productSelectTemplate(record.producto),
      valveSelectTemplate(record.tipo_valvula),
      fieldTemplate("cantidad", "Cantidad", record.cantidad, "number", "col-sm-6", 'min="1" step="1"'),
      fieldTemplate("costo_balon", "Costo balon", record.costo_balon, "number", "col-sm-6", 'min="0" step="0.01"'),
      fieldTemplate("precio_venta", "Precio venta", record.precio_venta, "number", "col-sm-6", 'min="0" step="0.01"'),
      paymentFields(record),
      fieldTemplate("dinero_entregado", "Dinero entregado", record.dinero_entregado || 0, "number", "col-sm-6", 'min="0" step="0.01"'),
      fieldTemplate("observaciones", "Observaciones", record.observaciones, "text", "col-12"),
    ].join("");
  }
  if (type === "gasto") {
    return [
      fieldTemplate("fecha", "Fecha", record.fecha, "date"),
      fieldTemplate("monto", "Monto", record.monto, "number", "col-sm-6", 'min="0" step="0.01"'),
      fieldTemplate("concepto", "Concepto", record.concepto, "text", "col-12"),
      selectTemplate("categoria", "Categoria", record.categoria, [
        { value: "Combustible", label: "Combustible" },
        { value: "Planilla", label: "Planilla" },
        { value: "Servicios", label: "Servicios" },
        { value: "Compras", label: "Compras" },
        { value: "Marketing", label: "Marketing" },
        { value: "General", label: "General" },
      ], "col-12"),
      fieldTemplate("observaciones", "Observaciones", record.observaciones, "text", "col-12"),
    ].join("");
  }
  if (type === "liquidacion") {
    const sale = window.dashboardData.management.ventas.find((item) => item.id === record.venta_id) || {};
    const paymentRecord = sale.id ? sale : { pago_efectivo: record.debe_entregar };
    return [
      fieldTemplate("fecha", "Fecha", record.fecha, "date"),
      paymentFields(paymentRecord),
      fieldTemplate("dinero_entregado", "Dinero entregado", record.entregado || sale.dinero_entregado || 0, "number", "col-sm-6", 'min="0" step="0.01"'),
      fieldTemplate("observaciones", "Observaciones", record.observaciones, "text", "col-12"),
    ].join("");
  }
  if (type === "repartidor") {
    return [
      fieldTemplate("fecha", "Fecha", window.dashboardData.selected_date, "date"),
      fieldTemplate("nombre", "Nombre", record.nombre || record.driver, "text", "col-sm-6", "required"),
      fieldTemplate("telefono", "Telefono", record.telefono || "", "text", "col-sm-6"),
    ].join("");
  }
  return "";
}

function endpointFor(type, id, mode) {
  const actions = {
    pedido: mode === "delete" ? `/pedidos/${id}/anular` : `/pedidos/${id}/editar`,
    venta: mode === "delete" ? `/ventas/${id}/eliminar` : `/ventas/${id}/editar`,
    gasto: mode === "delete" ? `/gastos/${id}/eliminar` : `/gastos/${id}/editar`,
    liquidacion: mode === "delete" ? `/liquidaciones/${id}/eliminar` : `/liquidaciones/${id}/editar`,
    repartidor: mode === "delete" ? `/repartidores/${id}/eliminar` : `/repartidores/${id}/editar`,
  };
  return actions[type] || "#";
}

function setupCrudActions() {
  const editModal = new bootstrap.Modal(document.querySelector("#editModal"));
  const deleteModal = new bootstrap.Modal(document.querySelector("#deleteModal"));
  const editForm = document.querySelector("#editForm");
  const deleteForm = document.querySelector("#deleteForm");
  const editFields = document.querySelector("#editFields");

  document.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-type]");
    const deleteButton = event.target.closest("[data-delete-type]");

    if (editButton) {
      const type = editButton.dataset.editType;
      const id = editButton.dataset.id;
      const record = getRecord(type, id);
      if (!record) {
        return;
      }
      document.querySelector("#editModalTitle").textContent = `Editar ${type}`;
      editForm.action = endpointFor(type, id, "edit");
      editFields.innerHTML = fieldsForRecord(type, record);
      setupEditProductValveToggle();
      editModal.show();
    }

    if (deleteButton) {
      const type = deleteButton.dataset.deleteType;
      const id = deleteButton.dataset.id;
      const isOrder = type === "pedido";
      document.querySelector("#deleteModalTitle").textContent = isOrder ? "Anular pedido" : "Eliminar registro";
      document.querySelector("#deleteModalText").textContent = isOrder
        ? "Seguro que deseas anular este pedido?"
        : "Seguro que deseas eliminar este registro?";
      deleteForm.action = endpointFor(type, id, "delete");
      deleteModal.show();
    }
  });
}

function setupScrollPersistence() {
  const storageKey = "sistemaGasScrollY";
  const saved = sessionStorage.getItem(storageKey);
  if (saved) {
    requestAnimationFrame(() => {
      window.scrollTo({ top: Number(saved) || 0, behavior: "auto" });
      sessionStorage.removeItem(storageKey);
    });
  }
  document.querySelectorAll("form").forEach((form) => {
    form.addEventListener("submit", () => {
      sessionStorage.setItem(storageKey, String(window.scrollY));
    });
  });
}

renderDashboard(window.dashboardData);
setupScrollPersistence();
setupMobileMenu();
setupSaleCalculator();
setupNewOrderCalculator();
setupDriverLiquidationPreview();
setupOrderLiquidationCalculator();
setupFiseManualCalculator();
setupLiveFilters();
setupGestionAjax();
setupCreditPaymentModal();
setupCrudActions();
setInterval(refreshDashboard, 15000);
