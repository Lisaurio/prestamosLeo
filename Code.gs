/**
 * MIS PRESTAMOS - Backend
 * Google Apps Script Web App
 */

function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('Mis Préstamos')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === 'Config') {
      sheet.appendRow(['clave', 'valor']);
      sheet.appendRow(['tasa_7d', 40]);
      sheet.appendRow(['tasa_15d', 60]);
      sheet.appendRow(['tasa_30d', 80]);
      sheet.appendRow(['password', hashPassword('admin123')]);
    } else if (name === 'Clientes') {
      sheet.appendRow(['id', 'nombre', 'telefono', 'direccion', 'dni', 'tasa_preferencial', 'notas', 'extra_campos', 'fecha_registro']);
    } else if (name === 'Prestamos') {
      sheet.appendRow(['id', 'cliente_id', 'monto', 'tasa', 'total', 'dias_plazo', 'fecha_inicio', 'fecha_vence', 'fecha_pago', 'estado', 'notas']);
    } else if (name === 'Pagos') {
      sheet.appendRow(['id', 'prestamo_id', 'monto', 'fecha']);
    }
  } else {
    ensureSchema(name, sheet);
  }
  return sheet;
}

function ensureSchema(name, sheet) {
  var headers = (sheet.getDataRange().getValues()[0] || []).filter(function(h) { return h !== ''; });
  if (!headers.length) return;

  if (name === 'Clientes') {
    var expected = ['id', 'nombre', 'telefono', 'direccion', 'dni', 'tasa_preferencial', 'notas', 'extra_campos', 'fecha_registro'];
    if (headers.length >= expected.length) return;

    // Old schema (6 cols): id, nombre, telefono, tasa_preferencial, notas, fecha_registro
    if (headers.length === 6 && headers[0] === 'id' && headers[1] === 'nombre' && headers[2] === 'telefono') {
      // id(1) | nombre(2) | telefono(3) | tasa_pref(4) | notas(5) | fecha_reg(6)
      sheet.insertColumnBefore(4); // insert 'direccion' before tasa_preferencial
      sheet.getRange(1, 4).setValue('direccion');
      sheet.insertColumnBefore(5); // insert 'dni' before tasa_preferencial (shifted)
      sheet.getRange(1, 5).setValue('dni');
      // id | nombre | telefono | direccion | dni | tasa_pref | notas | fecha_reg
      sheet.insertColumnBefore(8); // insert 'extra_campos' before fecha_registro
      sheet.getRange(1, 8).setValue('extra_campos');
      return;
    }

    // Fallback: add missing columns at the end
    for (var i = headers.length; i < expected.length; i++) {
      sheet.getRange(1, i + 1).setValue(expected[i]);
    }
  } else if (name === 'Prestamos') {
    var expected = ['id', 'cliente_id', 'monto', 'tasa', 'total', 'dias_plazo', 'fecha_inicio', 'fecha_vence', 'fecha_pago', 'estado', 'notas'];
    if (headers.length >= expected.length) return;
    for (var i = headers.length; i < expected.length; i++) {
      sheet.getRange(1, i + 1).setValue(expected[i]);
    }
  } else if (name === 'Pagos') {
    if (headers.length >= 4) return;
    if (headers.length === 1 && headers[0] === 'id') {
      sheet.getRange(1, 2).setValue('prestamo_id');
      sheet.getRange(1, 3).setValue('monto');
      sheet.getRange(1, 4).setValue('fecha');
    }
  }
}

function nextId(sheetName) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return 1;
  var maxId = 0;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] > maxId) maxId = data[i][0];
  }
  return maxId + 1;
}

function hashPassword(pass) {
  return Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, pass, Utilities.Charset.UTF_8
  ).map(function(b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('');
}

function requireAuth(token) {
  var stored = PropertiesService.getScriptProperties().getProperty('session_token');
  if (!stored || stored !== token) {
    throw new Error('Sesión expirada. Inicia sesión de nuevo.');
  }
}

function login(usuario, password) {
  var config = getSheet('Config');
  var data = config.getDataRange().getValues();
  var storedHash = '';
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === 'password') storedHash = data[i][1];
  }
  if (!storedHash || hashPassword(password) !== storedHash) {
    throw new Error('Usuario o contraseña incorrectos');
  }
  var token = Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperty('session_token', token);
  return { token: token };
}

function logout(token) {
  requireAuth(token);
  PropertiesService.getScriptProperties().deleteProperty('session_token');
  return true;
}

function getConfig(token) {
  requireAuth(token);
  var config = getSheet('Config');
  var data = config.getDataRange().getValues();
  var result = {};
  for (var i = 1; i < data.length; i++) {
    result[data[i][0]] = data[i][1];
  }
  return result;
}

function saveConfig(token, cfg) {
  requireAuth(token);
  var sheet = getSheet('Config');
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var key = data[i][0];
    if (key in cfg) {
      sheet.getRange(i + 1, 2).setValue(cfg[key]);
    }
  }
  return true;
}

function changePassword(token, actual, nueva) {
  requireAuth(token);
  var config = getSheet('Config');
  var data = config.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === 'password') {
      if (hashPassword(actual) !== data[i][1]) {
        throw new Error('La contraseña actual no es correcta');
      }
      config.getRange(i + 1, 2).setValue(hashPassword(nueva));
      return true;
    }
  }
  throw new Error('Error al cambiar contraseña');
}

function getClientes(token) {
  try {
    requireAuth(token);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    var ps = ss.getSheetByName('Prestamos');
    var pendientes = {};
    if (ps) {
      var pd = ps.getDataRange().getValues();
      for (var i = 1; i < pd.length; i++) {
        var cid = pd[i][1];
        if (!pendientes[cid]) pendientes[cid] = { count: 0, total: 0 };
        pendientes[cid].count++;
        if (pd[i][9] === 'Pendiente') {
          pendientes[cid].total += pd[i][4];
        }
      }
    }

    var sheet = ss.getSheetByName('Clientes');
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    var clientes = [];
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === '' || data[i][0] === null || data[i][0] === undefined) continue;
      var id = data[i][0];
      clientes.push({
        id: id,
        nombre: data[i][1] || '',
        telefono: data[i][2] || '',
        direccion: data[i][3] || '',
        dni: data[i][4] || '',
        tasa_preferencial: data[i][5] || '',
        notas: data[i][6] || '',
        extra_campos: data[i][7] || '{}',
        fecha_registro: data[i][8] || '',
        total_prestamos: pendientes[id] ? pendientes[id].count : 0,
        pendiente: pendientes[id] ? pendientes[id].total : 0
      });
    }
    return clientes;
  } catch (e) {
    return [];
  }
}

function saveCliente(token, c) {
  requireAuth(token);
  var sheet = getSheet('Clientes');
  if (c.id) {
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == c.id) {
        sheet.getRange(i + 1, 2).setValue(c.nombre);
        sheet.getRange(i + 1, 3).setValue(c.telefono || '');
        sheet.getRange(i + 1, 4).setValue(c.direccion || '');
        sheet.getRange(i + 1, 5).setValue(c.dni || '');
        sheet.getRange(i + 1, 6).setValue(c.tasa_preferencial || '');
        sheet.getRange(i + 1, 7).setValue(c.notas || '');
        sheet.getRange(i + 1, 8).setValue(c.extra_campos || '{}');
        return { id: c.id };
      }
    }
    throw new Error('Cliente no encontrado');
  }
  var id = nextId('Clientes');
  sheet.appendRow([id, c.nombre, c.telefono || '', c.direccion || '', c.dni || '', c.tasa_preferencial || '', c.notas || '', c.extra_campos || '{}', new Date().toISOString().split('T')[0]]);
  return { id: id };
}

function getClienteInfo(token, clienteId) {
  requireAuth(token);
  var sheet = getSheet('Clientes');
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == clienteId) {
      return {
        id: data[i][0],
        nombre: data[i][1],
        telefono: data[i][2] || '',
        direccion: data[i][3] || '',
        dni: data[i][4] || '',
        tasa_preferencial: data[i][5] || '',
        notas: data[i][6] || '',
        extra_campos: data[i][7] || '{}'
      };
    }
  }
  throw new Error('Cliente no encontrado');
}

function getPrestamos(token, filtro) {
  requireAuth(token);
  var sheet = getSheet('Prestamos');
  var data = sheet.getDataRange().getValues();
  var clientesData = getSheet('Clientes').getDataRange().getValues();
  var cmap = {};
  for (var i = 1; i < clientesData.length; i++) {
    cmap[clientesData[i][0]] = clientesData[i][1];
  }
  var prestamos = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === '') continue;
    if (filtro === 'pendientes' && data[i][9] !== 'Pendiente') continue;
    if (filtro === 'pagados' && data[i][9] !== 'Pagado') continue;
    prestamos.push({
      id: data[i][0],
      cliente_id: data[i][1],
      cliente_nombre: cmap[data[i][1]] || 'Desconocido',
      monto: data[i][2],
      tasa: data[i][3],
      total: data[i][4],
      dias_plazo: data[i][5],
      fecha_inicio: data[i][6],
      fecha_vence: data[i][7],
      fecha_pago: data[i][8],
      estado: data[i][9],
      notas: data[i][10]
    });
  }
  return prestamos;
}

function getPrestamosCliente(token, clienteId) {
  requireAuth(token);
  var sheet = getSheet('Prestamos');
  var data = sheet.getDataRange().getValues();
  var prestamos = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === '' || data[i][1] != clienteId) continue;
    prestamos.push({
      id: data[i][0],
      monto: data[i][2],
      tasa: data[i][3],
      total: data[i][4],
      dias_plazo: data[i][5],
      fecha_inicio: data[i][6],
      fecha_vence: data[i][7],
      fecha_pago: data[i][8],
      estado: data[i][9]
    });
  }
  return prestamos;
}

function savePrestamo(token, p) {
  requireAuth(token);
  var monto = parseFloat(p.monto);
  var tasa = parseFloat(p.tasa);
  var dias = parseInt(p.dias_plazo);
  var total = monto + (monto * tasa / 100);
  var fechaInicio = new Date();
  var fechaVence = new Date(fechaInicio.getTime() + dias * 24 * 60 * 60 * 1000);
  var id = nextId('Prestamos');

  var sheet = getSheet('Prestamos');
  sheet.appendRow([
    id, p.cliente_id, monto, tasa, total, dias,
    fechaInicio.toISOString().split('T')[0],
    fechaVence.toISOString().split('T')[0],
    '', 'Pendiente', p.notas || ''
  ]);

  return { id: id, total: total };
}

function pagarPrestamo(token, prestamoId) {
  requireAuth(token);
  var sheet = getSheet('Prestamos');
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == prestamoId) {
      if (data[i][9] === 'Pagado') throw new Error('Ya está pagado');
      var hoy = new Date().toISOString().split('T')[0];
      var total = data[i][4];
      sheet.getRange(i + 1, 9).setValue(hoy);  // fecha_pago
      sheet.getRange(i + 1, 10).setValue('Pagado');  // estado
      var pagoId = nextId('Pagos');
      getSheet('Pagos').appendRow([pagoId, prestamoId, total, hoy]);
      return true;
    }
  }
  throw new Error('Préstamo no encontrado');
}

function eliminarPrestamo(token, prestamoId) {
  requireAuth(token);
  var sheet = getSheet('Prestamos');
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == prestamoId) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  throw new Error('Préstamo no encontrado');
}

function getAlertas(token) {
  requireAuth(token);
  var prestamos = getSheet('Prestamos').getDataRange().getValues();
  var clientesData = getSheet('Clientes').getDataRange().getValues();
  var cmap = {};
  for (var i = 1; i < clientesData.length; i++) {
    cmap[clientesData[i][0]] = clientesData[i][1];
  }
  var hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  var vencidos = [], venceHoy = [], proximos = [];

  for (var i = 1; i < prestamos.length; i++) {
    if (prestamos[i][0] === '' || prestamos[i][9] !== 'Pendiente') continue;
    var vence = new Date(prestamos[i][7]);
    vence.setHours(0, 0, 0, 0);
    var diff = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));
    var info = {
      id: prestamos[i][0],
      cliente: cmap[prestamos[i][1]] || 'Desconocido',
      monto: prestamos[i][2],
      total: prestamos[i][4],
      fecha_vence: prestamos[i][7],
      dias: diff
    };
    if (diff < 0) vencidos.push(info);
    else if (diff === 0) venceHoy.push(info);
    else if (diff <= 3) proximos.push(info);
  }
  return { vencidos: vencidos, venceHoy: venceHoy, proximos: proximos };
}

function getDashboard(token) {
  requireAuth(token);
  var prestamos = getSheet('Prestamos').getDataRange().getValues();
  var pagos = getSheet('Pagos').getDataRange().getValues();
  var hoy = new Date();
  var mes = hoy.getMonth();
  var anio = hoy.getFullYear();
  var prestadoMes = 0, recuperadoMes = 0, circulacion = 0, gananciasMes = 0;
  var ultimos = [];

  for (var i = 1; i < prestamos.length; i++) {
    if (prestamos[i][0] === '') continue;
    var fi = new Date(prestamos[i][6]);
    if (fi.getMonth() === mes && fi.getFullYear() === anio) {
      prestadoMes += prestamos[i][2];
    }
    if (prestamos[i][9] === 'Pendiente') {
      circulacion += prestamos[i][4];
    }
  }

  for (var i = 1; i < pagos.length; i++) {
    if (pagos[i][0] === '') continue;
    var fp = new Date(pagos[i][3]);
    if (fp.getMonth() === mes && fp.getFullYear() === anio) {
      recuperadoMes += pagos[i][2];
      for (var j = 1; j < prestamos.length; j++) {
        if (prestamos[j][0] == pagos[i][1]) {
          gananciasMes += (prestamos[j][4] - prestamos[j][2]);
          ultimos.push({
            prestamoId: pagos[i][1],
            clienteId: prestamos[j][1],
            monto: pagos[i][2],
            fecha: pagos[i][3]
          });
          break;
        }
      }
    }
  }

  ultimos.sort(function(a, b) { return b.fecha.localeCompare(a.fecha); });
  ultimos = ultimos.slice(0, 5);

  var clientesData = getSheet('Clientes').getDataRange().getValues();
  var cmap = {};
  for (var i = 1; i < clientesData.length; i++) {
    cmap[clientesData[i][0]] = clientesData[i][1];
  }
  for (var i = 0; i < ultimos.length; i++) {
    ultimos[i].cliente = cmap[ultimos[i].clienteId] || '?';
  }

  return {
    prestadoMes: prestadoMes,
    recuperadoMes: recuperadoMes,
    circulacion: circulacion,
    gananciasMes: gananciasMes,
    ultimos: ultimos
  };
}

function getReporte(token, mes, anio) {
  requireAuth(token);
  mes = parseInt(mes);
  anio = parseInt(anio);
  var prestamos = getSheet('Prestamos').getDataRange().getValues();
  var pagos = getSheet('Pagos').getDataRange().getValues();
  var clientesData = getSheet('Clientes').getDataRange().getValues();
  var cmap = {};
  for (var i = 1; i < clientesData.length; i++) {
    cmap[clientesData[i][0]] = clientesData[i][1];
  }

  var prestado = 0, recuperado = 0, ganancias = 0, circulacion = 0;
  var detalle = [];

  for (var i = 1; i < prestamos.length; i++) {
    if (prestamos[i][0] === '') continue;
    var fi = new Date(prestamos[i][6]);
    if (fi.getMonth() === mes && fi.getFullYear() === anio) {
      prestado += prestamos[i][2];
      detalle.push({
        id: prestamos[i][0],
        cliente: cmap[prestamos[i][1]] || '?',
        monto: prestamos[i][2],
        total: prestamos[i][4],
        estado: prestamos[i][9],
        fecha: prestamos[i][6]
      });
    }
    if (prestamos[i][9] === 'Pendiente') {
      circulacion += prestamos[i][4];
    }
  }

  for (var i = 1; i < pagos.length; i++) {
    if (pagos[i][0] === '') continue;
    var fp = new Date(pagos[i][3]);
    if (fp.getMonth() === mes && fp.getFullYear() === anio) {
      recuperado += pagos[i][2];
      for (var j = 1; j < prestamos.length; j++) {
        if (prestamos[j][0] == pagos[i][1]) {
          ganancias += (prestamos[j][4] - prestamos[j][2]);
          break;
        }
      }
    }
  }

  return {
    prestado: prestado,
    recuperado: recuperado,
    circulacion: circulacion,
    ganancias: ganancias,
    detalle: detalle
  };
}

function ping() {
  return { ok: true, mensaje: 'servidor vivo' };
}

function testSheet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var nombre = ss.getName();
    var sheets = ss.getSheets().map(function(s) { return s.getName(); });
    var clientes = ss.getSheetByName('Clientes');
    var data = clientes ? clientes.getDataRange().getValues() : [];
    var result = {
      ok: true,
      nombre: nombre,
      sheets: sheets,
      clientes_filas: data.length,
      primera_fila: data.length > 1 ? data[1] : 'sin datos'
    };
    console.log(JSON.stringify(result));
    return result;
  } catch (e) {
    console.log(JSON.stringify({ error: e.message }));
    return { error: e.message };
  }
}

function testClientes() {
  return { desde: 'testClientes', ok: true, hora: new Date().toISOString() };
}
