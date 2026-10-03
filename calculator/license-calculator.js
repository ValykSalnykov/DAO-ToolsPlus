(() => {
  // Прайс не зберігається в коді розширення: сторінка отримує його з SLM через background.
  let DATA = null;
  const THEME = window.daoCalculatorTheme;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const DEPLOYMENT = Object.freeze({ cloud: 'CLOUD', lt: 'LT' });
  const PLAN = Object.freeze({ pro: 'PRO', enterprise: 'ENTERPRISE' });
  const LIMITS = Object.freeze({
    currentFronts: Object.freeze({ min: 1, max: 50 }),
    addedFronts: Object.freeze({ min: 0, max: 99 }),
    addon: Object.freeze({ min: 0, max: 999 })
  });
  const SECURE_DEFAULT_PORT_DOMAINS = ['syrve.online', 'daocloud.it'];
  const CLOUD_SUBSCRIPTION_HOST_SUFFIX = '.syrve.online';
  const CALLCENTER_MODULE_ID = '1400';
  const FRONT_MODULE_ID = '100';
  const POPULAR_MODULE_IDS = new Set(['19007518', '2301', '2000060600', '1200', '21011218', '21011219']);
  const POPULAR_IDS = new Set(['waiter', 'driver', 'dashboard_rms', 'souschef', 'loyalty_pro', 'loyalty_ent']);
  const LOYALTY_MODULE_IDS = new Set(['21011218', '21011219']);
  const EXTENSION_KEY_STORAGE_KEY = 'extensionAccessKey';
  const HANDOFF_SESSION_KEY = 'licenseCalculatorHandoff';
  const LICENSE_GROUP_ORDER = ['pos', 'api', 'mobile', 'other'];
  const LICENSE_GROUP_LABELS = Object.freeze({
    pos: 'POS',
    api: 'API',
    mobile: 'Мобільні',
    other: 'Інше'
  });
  const SUBSCRIPTIONS = Object.freeze({
    enterprise: Object.freeze({ label: 'Cloud Enterprise', modifier: 'enterprise' }),
    pro: Object.freeze({ label: 'Cloud PRO', modifier: 'pro' }),
    unknown: Object.freeze({ label: 'Підписку не визначено', modifier: 'unknown' })
  });
  const LICENSE_STATUS_DESCRIPTIONS = Object.freeze({
    ok: 'Ліцензії на сервері активні.',
    success: 'Ліцензії на сервері активні.',
    valid: 'Ліцензії на сервері активні.',
    active: 'Ліцензії на сервері активні.',
    missed: 'Сервер не підтвердив продовження ліцензій. Варто перевірити, чи заплановане оновлення дійсно виконано.',
    expired: 'Термін дії ліцензій завершився. Потрібно продовження або ручна перевірка на стороні сервера.',
    not_valid: 'Сервер вважає ліцензії невалідними. Автоматично продовжити їх не вдалося, потрібна ручна перевірка.',
    invalid: 'Сервер вважає ліцензії невалідними. Автоматично продовжити їх не вдалося, потрібна ручна перевірка.',
    denied: 'Сервер відмовив у доступі до інформації про ліцензії. Перевірте права доступу або налаштування.',
    failed: 'Під час перевірки сталася помилка. Спробуйте ще раз або перевірте доступність сервера.',
    error: 'Під час перевірки сталася помилка. Спробуйте ще раз або перевірте доступність сервера.'
  });
  const COPY_FEEDBACK_MS = 2000;
  const NUMBER_FORMAT = new Intl.NumberFormat('uk-UA');
  const TIME_FORMAT = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' });
  const DATE_TIME_FORMAT = new Intl.DateTimeFormat('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  const EMPTY_CHECK = Object.freeze({
    status: 'idle',
    context: null,
    server: null,
    licenses: [],
    checkedAt: 0,
    error: ''
  });

  const state = {
    deployment: DEPLOYMENT.cloud,
    plan: PLAN.pro,
    currentFronts: 1,
    addedFronts: 0,
    addonQuantities: new Map(),
    access: 'unknown',
    validationError: '',
    check: EMPTY_CHECK,
    serverSuggestion: null,
    cardContext: null,
    licensesCollapsed: false
  };

  let checkRequestToken = 0;
  let copyFeedbackTimerId = 0;

  const priceUpdatedAtNode = document.getElementById('priceUpdatedAt');
  const priceMetaButton = document.getElementById('priceMetaButton');
  const priceChangesPopover = document.getElementById('priceChangesPopover');
  const priceChangesTitle = document.getElementById('priceChangesTitle');
  const priceChangesClose = document.getElementById('priceChangesClose');
  const priceChangesList = document.getElementById('priceChangesList');
  const themeToggle = document.getElementById('themeToggle');
  const themeToggleIcon = document.getElementById('themeToggleIcon');
  const checkForm = document.getElementById('checkForm');
  const serverInput = document.getElementById('serverInput');
  const portInput = document.getElementById('portInput');
  const accessNotice = document.getElementById('accessNotice');
  const checkButton = document.getElementById('checkButton');
  const checkButtonIcon = document.getElementById('checkButtonIcon');
  const checkButtonSpinner = document.getElementById('checkButtonSpinner');
  const checkButtonLabel = document.getElementById('checkButtonLabel');
  const checkError = document.getElementById('checkError');
  const checkResult = document.getElementById('checkResult');
  const deploymentButtons = [...document.querySelectorAll('[data-deployment]')];
  const deploymentHint = document.getElementById('deploymentHint');
  const planGroup = document.getElementById('planGroup');
  const planButtons = [...document.querySelectorAll('[data-plan]')];
  const planHint = document.getElementById('planHint');
  const currentFrontsField = document.getElementById('currentFrontsField');
  const currentFrontsUnit = document.getElementById('currentFrontsUnit');
  const posLtNotice = document.getElementById('posLtNotice');
  const posControls = document.getElementById('posControls');
  const posTitle = document.getElementById('posTitle');
  const posTariffHint = document.getElementById('posTariffHint');
  const addedFrontsField = document.getElementById('addedFrontsField');
  const frontInfoList = document.getElementById('frontInfoList');
  const popularAddonList = document.getElementById('popularAddonList');
  const otherAddonList = document.getElementById('otherAddonList');
  const totalMonthlyNode = document.getElementById('totalMonthly');
  const totalSetupNode = document.getElementById('totalSetup');
  const bottomMonthlyNode = document.getElementById('bottomMonthly');
  const bottomSetupNode = document.getElementById('bottomSetup');
  const resetButton = document.getElementById('resetButton');
  const messagePanel = document.getElementById('messagePanel');
  const messageText = document.getElementById('messageText');
  const copyButton = document.getElementById('copyButton');
  const copyButtonIcon = document.getElementById('copyButtonIcon');
  const copyButtonLabel = document.getElementById('copyButtonLabel');
  const scrollToMessageButton = document.getElementById('scrollToMessageButton');
  const pricingNotice = document.getElementById('pricingNotice');
  const pricingNoticeSpinner = document.getElementById('pricingNoticeSpinner');
  const pricingNoticeTitle = document.getElementById('pricingNoticeTitle');
  const pricingNoticeText = document.getElementById('pricingNoticeText');
  const pricingRetryButton = document.getElementById('pricingRetryButton');
  const consultationDialog = document.getElementById('consultationDialog');
  const consultationText = document.getElementById('consultationText');
  const workspace = document.querySelector('.workspace');
  const pageSummary = document.querySelector('.page__summary');
  const bottomBar = document.querySelector('.bottom-bar');

  // ---------- Helpers ----------

  const createNode = (tagName, className = '', text = '') => {
    const node = document.createElement(tagName);
    if (className) {
      node.className = className;
    }
    if (text) {
      node.textContent = text;
    }
    return node;
  };

  const createIcon = (symbolId) => {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', `#${symbolId}`);
    svg.appendChild(use);
    return svg;
  };

  const createChip = (text, tone = '') => createNode('span', ['chip', tone ? `chip--${tone}` : ''].filter(Boolean).join(' '), text);

  const setIcon = (svg, symbolId) => {
    svg?.querySelector('use')?.setAttribute('href', `#${symbolId}`);
  };

  const clamp = (value, { min, max }) => Math.min(max, Math.max(min, value));

  const formatNumber = (value) => NUMBER_FORMAT.format(value);

  const pluralizeFronts = (count) => {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) {
      return 'фронт';
    }
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
      return 'фронти';
    }
    return 'фронтів';
  };

  const formatCheckedAt = (timestamp) => {
    if (!timestamp) {
      return '';
    }

    const date = new Date(timestamp);
    const isToday = date.toDateString() === new Date().toDateString();
    return `Перевірено ${isToday ? TIME_FORMAT.format(date) : DATE_TIME_FORMAT.format(date)}`;
  };

  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const sendRuntimeMessage = (message) => new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (!response?.ok) {
        reject(new Error(response?.error || 'Помилка обробки запиту розширення.'));
        return;
      }

      resolve(response);
    });
  });

  const readHandoff = (handoffId) => new Promise((resolve) => {
    if (!handoffId || !chrome.storage?.session) {
      resolve(null);
      return;
    }

    chrome.storage.session.get(HANDOFF_SESSION_KEY, (result) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }

      const handoff = result?.[HANDOFF_SESSION_KEY];
      resolve(handoff?.id === handoffId && handoff.context?.server ? handoff : null);
    });
  });

  // ---------- Server address ----------

  const parseServerEndpoint = (value) => {
    const rawValue = String(value || '').trim();
    if (!rawValue) {
      return null;
    }

    const candidate = /^[a-z]+:\/\//i.test(rawValue) ? rawValue : `http://${rawValue}`;

    try {
      const parsed = new URL(candidate);
      return {
        server: parsed.hostname.trim().toLowerCase(),
        port: parsed.port.trim()
      };
    } catch (error) {
      return null;
    }
  };

  const isSecureDefaultPortHost = (server) => SECURE_DEFAULT_PORT_DOMAINS.some((domain) => server.endsWith(domain));

  const isCloudSubscriptionHost = (server) => String(server || '').toLowerCase().endsWith(CLOUD_SUBSCRIPTION_HOST_SUFFIX);

  const formatServerLabel = (context) => (context?.port ? `${context.server}:${context.port}` : context?.server || '');

  const resolveServerContext = () => {
    const endpoint = parseServerEndpoint(serverInput.value);
    if (!endpoint?.server) {
      return { context: null, error: 'Вкажіть коректну адресу сервера.', field: serverInput };
    }

    const port = portInput.value.trim()
      || endpoint.port
      || (isSecureDefaultPortHost(endpoint.server) ? '443' : '');

    if (!port) {
      return { context: null, error: 'Вкажіть порт сервера.', field: portInput };
    }

    const numericPort = Number(port);
    if (!/^\d+$/.test(port) || numericPort < 1 || numericPort > 65535) {
      return { context: null, error: 'Порт має бути числом від 1 до 65535.', field: portInput };
    }

    return { context: { server: endpoint.server, port }, error: '', field: null };
  };

  const applyDefaultPort = () => {
    const endpoint = parseServerEndpoint(serverInput.value);
    if (endpoint?.server && !portInput.value.trim() && isSecureDefaultPortHost(endpoint.server)) {
      portInput.value = '443';
    }
  };

  // ---------- License check results ----------

  const normalizeLicenseStatus = (status) => String(status || '').trim().toLowerCase().replace(/[\s-]+/g, '_');

  const resolveLicenseStatusInfo = (status) => {
    const normalizedStatus = normalizeLicenseStatus(status);
    let label = 'Невідомий статус ліцензій';
    let tone = 'warning';

    if (!normalizedStatus) {
      label = 'Статус ліцензій невідомий';
    } else if (['ok', 'success', 'valid', 'active'].includes(normalizedStatus)) {
      label = 'Ліцензії активні';
      tone = 'success';
    } else if (normalizedStatus === 'missed') {
      label = 'Ліцензії не продовжені';
    } else if (normalizedStatus === 'expired') {
      label = 'Ліцензії прострочені';
      tone = 'error';
    } else if (['not_valid', 'invalid'].includes(normalizedStatus)) {
      label = 'Ліцензії невалідні';
      tone = 'error';
    } else if (normalizedStatus === 'denied') {
      label = 'У доступі до ліцензій відмовлено';
      tone = 'error';
    } else if (normalizedStatus === 'failed') {
      label = 'Перевірка ліцензій не виконана';
      tone = 'error';
    } else if (normalizedStatus === 'error') {
      label = 'Помилка перевірки ліцензій';
      tone = 'error';
    } else if (['expired', 'invalid', 'denied', 'failed', 'error'].some((token) => normalizedStatus.includes(token))) {
      tone = 'error';
    }

    return {
      label,
      tone,
      description: LICENSE_STATUS_DESCRIPTIONS[normalizedStatus]
        || 'Сервер повернув нестандартний статус ліцензій. Варто перевірити стан вручну.'
    };
  };

  const hasCheckResult = () => state.check.status === 'success';

  const sumLicenseCount = (licenses, moduleId) => licenses
    .filter((license) => license.id === moduleId)
    .reduce((total, license) => total + (Number(license.count) || 0), 0);

  const getServerLicenseCount = (moduleId) => (
    hasCheckResult() && moduleId ? sumLicenseCount(state.check.licenses, moduleId) : null
  );

  const resolveSubscription = (context, licenses) => {
    if (!isCloudSubscriptionHost(context?.server)) {
      return SUBSCRIPTIONS.unknown;
    }

    return licenses.some((license) => license.id === CALLCENTER_MODULE_ID)
      ? SUBSCRIPTIONS.enterprise
      : SUBSCRIPTIONS.pro;
  };

  const buildServerSuggestion = (context, licenses) => {
    const suggestion = {};

    if (isCloudSubscriptionHost(context?.server)) {
      suggestion.deployment = DEPLOYMENT.cloud;
      suggestion.plan = resolveSubscription(context, licenses) === SUBSCRIPTIONS.enterprise
        ? PLAN.enterprise
        : PLAN.pro;
    }

    const frontCount = sumLicenseCount(licenses, FRONT_MODULE_ID);
    if (frontCount > 0) {
      suggestion.currentFronts = clamp(frontCount, LIMITS.currentFronts);
    }

    return Object.keys(suggestion).length ? suggestion : null;
  };

  const applyServerSuggestion = () => {
    const suggestion = state.serverSuggestion;
    if (!suggestion) {
      return;
    }

    if (suggestion.deployment) {
      setDeployment(suggestion.deployment, { silent: true });
    }
    if (suggestion.plan) {
      state.plan = suggestion.plan;
    }
    if (suggestion.currentFronts) {
      state.currentFronts = suggestion.currentFronts;
    }
  };

  const parseDisplayDate = (value) => {
    const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(value || '').trim());
    if (!match) {
      return null;
    }

    const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const buildValidityNode = (validUntil) => {
    const normalizedValue = String(validUntil || '').trim();
    if (!normalizedValue) {
      return null;
    }

    if (normalizedValue.toLowerCase().includes('перманент')) {
      return createNode('span', 'lic__date lic__date--permanent', 'Перманентно');
    }

    const date = parseDisplayDate(normalizedValue);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isExpired = Boolean(date) && date < today;
    return createNode('span', isExpired ? 'lic__date lic__date--expired' : 'lic__date', normalizedValue);
  };

  const buildServerFact = (label, value) => {
    const fact = createNode('div', 'server-fact');
    const valueNode = createNode('span', 'server-fact__value', value);
    valueNode.title = value;
    fact.append(createNode('span', 'server-fact__label', label), valueNode);
    return fact;
  };

  const buildServerBar = ({ context, server, licenses, checkedAt }) => {
    const bar = createNode('div', 'server-bar');
    const statusInfo = resolveLicenseStatusInfo(server.licenseStatus);
    const subscription = resolveSubscription(context, licenses);

    const main = createNode('div', 'server-bar__main');
    const label = createNode('span', 'server-bar__label', 'Адреса сервера');
    const checkedAtLabel = formatCheckedAt(checkedAt);
    if (checkedAtLabel) {
      label.appendChild(createNode('span', 'server-bar__time', ` · ${checkedAtLabel.toLowerCase()}`));
    }
    main.append(label, createNode('span', 'server-bar__value', formatServerLabel(context)));

    const statusPill = createNode('span', `status-pill status-pill--${statusInfo.tone}`, statusInfo.label);
    statusPill.title = statusInfo.description;

    const subscriptionChip = createNode('span', `subscription-chip subscription-chip--${subscription.modifier}`, subscription.label);
    if (subscription === SUBSCRIPTIONS.unknown) {
      subscriptionChip.title = 'Підписка Cloud визначається лише для серверів *.syrve.online. Тип розміщення оберіть вручну.';
    } else {
      subscriptionChip.title = subscription === SUBSCRIPTIONS.enterprise
        ? 'На сервері є ліцензія Delivery (Callcenter)'
        : 'На сервері немає ліцензії Delivery (Callcenter)';
    }

    bar.append(main, statusPill, subscriptionChip);

    const facts = createNode('div', 'server-bar__facts');
    [
      ['Компанія', server.companyName],
      ['Тип', server.serverType],
      ['CRM ID', server.crmId],
      ['Serial', server.serialNumber]
    ].forEach(([label, value]) => {
      if (value) {
        facts.appendChild(buildServerFact(label, value));
      }
    });
    if (facts.childElementCount) {
      bar.appendChild(facts);
    }

    return bar;
  };

  const buildStatusNote = (server) => {
    const statusInfo = resolveLicenseStatusInfo(server.licenseStatus);
    if (statusInfo.tone === 'success' && !server.statusMessage) {
      return null;
    }

    const tone = statusInfo.tone === 'success' ? 'success' : statusInfo.tone;
    const note = createNode('p', `status-box status-box--${tone}`);
    note.appendChild(createNode('span', 'status-box__title', statusInfo.tone === 'success' ? 'Повідомлення сервера' : statusInfo.label));
    note.appendChild(document.createTextNode(
      [statusInfo.tone === 'success' ? '' : statusInfo.description, server.statusMessage || ''].filter(Boolean).join('\n')
    ));
    return note;
  };

  const describeValidity = (validUntil) => {
    const normalizedValue = String(validUntil || '').trim();
    if (!normalizedValue) {
      return '';
    }

    if (normalizedValue.toLowerCase().includes('перманент')) {
      return 'Діє перманентно';
    }

    const date = parseDisplayDate(normalizedValue);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date && date < today ? `Термін дії минув ${normalizedValue}` : `Діє до ${normalizedValue}`;
  };

  const buildLicenseItem = (license) => {
    const item = createNode('div', 'lic');
    const primaryName = license.friendlyName || license.name || `Ліцензія ${license.id || ''}`.trim();
    item.title = [
      primaryName,
      license.friendlyName && license.name && license.name !== license.friendlyName ? license.name : '',
      license.id ? `ID ${license.id}` : '',
      describeValidity(license.validUntil)
    ].filter(Boolean).join('\n');

    const main = createNode('p', 'lic__name', primaryName);
    const meta = createNode('div', 'lic__meta');
    if (license.count !== null && license.count !== undefined) {
      meta.appendChild(createNode('span', 'lic__count', `${license.count} шт.`));
    }
    const validityNode = buildValidityNode(license.validUntil);
    if (validityNode) {
      meta.appendChild(validityNode);
    }

    item.append(main, meta);
    return item;
  };

  const buildLicenseGroups = (licenses) => {
    const container = createNode('div', 'license-groups');
    container.id = 'licenseGroups';

    if (!licenses.length) {
      container.appendChild(createNode('p', 'empty-state', 'Не знайдено жодної ліцензії з цільового списку.'));
      return container;
    }

    const groupedLicenses = new Map(LICENSE_GROUP_ORDER.map((groupId) => [groupId, []]));
    licenses.forEach((license) => {
      const groupId = LICENSE_GROUP_ORDER.includes(license.groupId) ? license.groupId : 'other';
      groupedLicenses.get(groupId).push(license);
    });

    groupedLicenses.forEach((groupLicenses, groupId) => {
      if (!groupLicenses.length) {
        return;
      }

      const group = createNode('section', `group group--${groupId}`);
      const head = createNode('header', 'group__head');
      head.append(
        createNode('h3', 'group__title', LICENSE_GROUP_LABELS[groupId]),
        createNode('span', 'chip group__count', String(groupLicenses.length))
      );
      const list = createNode('div', 'group__list');
      groupLicenses.forEach((license) => list.appendChild(buildLicenseItem(license)));
      group.append(head, list);
      container.appendChild(group);
    });

    return container;
  };

  const renderCheckResult = () => {
    if (!hasCheckResult()) {
      checkResult.hidden = true;
      checkResult.replaceChildren();
      return;
    }

    const server = state.check.server || {};
    const nodes = [buildServerBar({ ...state.check, server })];
    const statusNote = buildStatusNote(server);
    if (statusNote) {
      nodes.push(statusNote);
    }

    const groups = buildLicenseGroups(state.check.licenses);
    if (state.check.licenses.length) {
      // Кнопка під списком: розгорнута панель читається як одне ціле, яке нею ж і згортається.
      const panel = createNode('div', 'licenses-panel');
      panel.dataset.role = 'licenses-panel';
      panel.append(groups, buildLicensesToggle(state.check.licenses));
      nodes.push(panel);
    } else {
      nodes.push(groups);
    }

    checkResult.replaceChildren(...nodes);
    checkResult.hidden = false;
    renderLicensesToggle();
  };

  const buildLicensesToggle = (licenses) => {
    const toggle = createNode('button', 'licenses-toggle');
    toggle.type = 'button';
    toggle.dataset.role = 'licenses-toggle';
    toggle.setAttribute('aria-controls', 'licenseGroups');

    const icon = createNode('span', 'licenses-toggle__icon');
    icon.appendChild(createNode('span', 'chevron'));
    icon.setAttribute('aria-hidden', 'true');

    const label = createNode('span');
    label.dataset.role = 'licenses-toggle-label';
    const summary = createNode('span', 'licenses-toggle__summary');
    summary.dataset.role = 'licenses-toggle-summary';
    LICENSE_GROUP_ORDER.forEach((groupId) => {
      const count = licenses.filter((license) => (
        (LICENSE_GROUP_ORDER.includes(license.groupId) ? license.groupId : 'other') === groupId
      )).length;
      if (count) {
        summary.appendChild(createChip(`${LICENSE_GROUP_LABELS[groupId]} ${count}`, 'blue'));
      }
    });

    toggle.append(icon, label, summary);
    toggle.addEventListener('click', () => {
      state.licensesCollapsed = !state.licensesCollapsed;
      renderLicensesToggle();
    });
    return toggle;
  };

  const renderLicensesToggle = () => {
    const groups = document.getElementById('licenseGroups');
    const panel = checkResult.querySelector('[data-role="licenses-panel"]');
    const toggle = checkResult.querySelector('[data-role="licenses-toggle"]');
    panel?.classList.toggle('is-expanded', !state.licensesCollapsed);
    if (toggle) {
      toggle.setAttribute('aria-expanded', String(!state.licensesCollapsed));
      toggle.querySelector('[data-role="licenses-toggle-label"]').textContent = state.licensesCollapsed
        ? `Показати ліцензії сервера (${state.check.licenses.length})`
        : 'Згорнути ліцензії сервера';
      toggle.querySelector('[data-role="licenses-toggle-summary"]').hidden = !state.licensesCollapsed;
    }
    if (groups && toggle) {
      groups.hidden = state.licensesCollapsed;
    }
  };

  const renderServerCheck = () => {
    const isLoading = state.check.status === 'loading';
    const isAccessMissing = state.access === 'missing';

    checkButton.disabled = isLoading || isAccessMissing;
    checkButtonIcon.toggleAttribute('hidden', isLoading);
    checkButtonSpinner.hidden = !isLoading;
    checkButtonLabel.textContent = isLoading ? 'Перевіряю...' : 'Перевірити ліцензії';
    accessNotice.hidden = !isAccessMissing;

    const errorMessage = state.validationError || (state.check.status === 'error' ? state.check.error : '');
    checkError.textContent = errorMessage;
    checkError.hidden = !errorMessage;
  };

  const showCheckResult = ({ context, result, checkedAt, collapsed = false }) => {
    state.check = {
      status: 'success',
      context,
      server: result?.server && typeof result.server === 'object' ? result.server : {},
      licenses: Array.isArray(result?.licenses) ? result.licenses : [],
      checkedAt: checkedAt || Date.now(),
      error: ''
    };
    state.validationError = '';
    state.licensesCollapsed = collapsed;
    state.serverSuggestion = buildServerSuggestion(context, state.check.licenses);
    applyServerSuggestion();

    serverInput.value = context.server;
    portInput.value = context.port || '';

    renderServerCheck();
    renderCheckResult();
    update();
  };

  const refreshAccessState = async () => {
    try {
      const response = await sendRuntimeMessage({ action: 'GET_EXTENSION_ACCESS_STATE' });
      state.access = response.state?.status === 'granted' ? 'granted' : 'missing';
    } catch (error) {
      state.access = 'unknown';
    }

    renderServerCheck();
  };

  const runLicenseCheck = async () => {
    const resolution = resolveServerContext();
    state.validationError = resolution.error;

    if (!resolution.context) {
      renderServerCheck();
      resolution.field?.focus();
      return;
    }

    const { context } = resolution;
    serverInput.value = context.server;
    portInput.value = context.port;

    const requestToken = ++checkRequestToken;
    state.check = { ...EMPTY_CHECK, status: 'loading', context };
    state.serverSuggestion = null;
    renderServerCheck();
    renderCheckResult();
    update();

    try {
      const response = await sendRuntimeMessage({
        action: 'CHECK_SYRVE_LICENSE',
        address: context.server,
        port: context.port
      });

      if (requestToken !== checkRequestToken) {
        return;
      }

      showCheckResult({ context, result: response.result, checkedAt: Date.now() });
    } catch (error) {
      if (requestToken !== checkRequestToken) {
        return;
      }

      state.check = {
        ...EMPTY_CHECK,
        status: 'error',
        context,
        error: error?.message || 'Не вдалося отримати ліцензії сервера.'
      };
      renderServerCheck();
      renderCheckResult();
      update();
      void refreshAccessState();
    }
  };

  // Hash від popup (server/port) або від модалки Planfix (+ handoff з готовим результатом і тема).
  const applyHash = async () => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    THEME?.applyFromHash();
    syncThemeToggle();

    const server = String(params.get('server') || '').trim();
    if (server) {
      serverInput.value = server;
      portInput.value = String(params.get('port') || '').trim();
      applyDefaultPort();
      state.validationError = '';
      if (state.check.status === 'error') {
        state.check = EMPTY_CHECK;
      }
      renderServerCheck();
    }

    state.cardContext = null;
    const handoff = await readHandoff(String(params.get('handoff') || '').trim());
    if (handoff) {
      state.cardContext = handoff.context;
      if (handoff.result) {
        checkRequestToken += 1;
        // Ліцензії щойно переглянуті в модалці Planfix — тут список згорнутий.
        showCheckResult({ context: handoff.context, result: handoff.result, checkedAt: handoff.createdAt, collapsed: true });
        return 'handoff';
      }
    }

    if (server) {
      // Пряме відкриття з картки: не показуємо ліцензії попереднього закладу.
      checkRequestToken += 1;
      state.check = EMPTY_CHECK;
      state.serverSuggestion = null;
      renderServerCheck();
      renderCheckResult();
      update();
    }
    return server ? 'server' : '';
  };

  // ---------- Calculation ----------

  const resolveFrontTier = (futureTotal) => {
    const tierIndex = futureTotal >= 5 ? 3 : Math.max(0, futureTotal - 2);
    return DATA.frontPricingTable[tierIndex];
  };

  const getFrontMonthlyCost = (tier) => (state.plan === PLAN.pro ? tier.proMonthlyUah : tier.enterpriseMonthlyUah);

  const getAddonMonthlyCost = (addon) => state.deployment === DEPLOYMENT.cloud && addon.freeInCloud ? 0 : addon.monthlyUah;
  const isAddonAvailable = (addon) => !(addon.cloudOnly && state.deployment === DEPLOYMENT.lt);
  const hasCardChain = () => {
    const context = state.cardContext;
    const current = resolveServerContext().context;
    if (!context || !current) return false;
    const cardPort = String(context.port || (isSecureDefaultPortHost(context.server) ? '443' : ''));
    if (context.server.toLowerCase() !== current.server || cardPort !== current.port) return false;
    const chain = String(context.chain || '').trim();
    return Boolean(chain) && !/^(?:[-–—]+|ні|нет|no|false|0|не вказано|не задано|не вибрано)$/i.test(chain);
  };
  const getConsultation = (addon) => {
    if (LOYALTY_MODULE_IDS.has(addon.moduleId) || ['loyalty_pro', 'loyalty_ent'].includes(addon.id)) {
      return 'Щодо замовлення та налаштування Loyalty варто звернутися до відділу впровадження / керівника технічної підтримки.';
    }
    if ((addon.moduleId === '2000060600' || addon.id === 'dashboard_rms') && hasCardChain()) {
      return 'DashBoard (for RMS): є різновиди цих ліцензій. Заклад у складі Chain, тому варто порадитися щодо замовлення з відділом впровадження / керівником технічної підтримки.';
    }
    return '';
  };
  const showConsultation = (text) => {
    consultationText.textContent = text;
    if (!consultationDialog.open) consultationDialog.showModal();
  };

  const calculate = () => {
    const isLt = state.deployment === DEPLOYMENT.lt;
    let monthlyUah = 0;
    let setupUsd = 0;
    const details = [];

    if (!isLt && state.addedFronts > 0) {
      const tier = resolveFrontTier(state.currentFronts + state.addedFronts);
      const totalMonthly = getFrontMonthlyCost(tier) * state.addedFronts;
      const totalSetup = tier.setupUsd * state.addedFronts;

      monthlyUah += totalMonthly;
      setupUsd += totalSetup;
      details.push(`Syrve POS (Front) x${state.addedFronts}: +${totalMonthly} грн/міс (Впровадження: $${totalSetup})`);
    }

    DATA.addonLicenses.forEach((addon) => {
      const quantity = state.addonQuantities.get(addon.id) || 0;
      if (quantity <= 0 || !isAddonAvailable(addon)) {
        return;
      }

      const monthlyPrice = getAddonMonthlyCost(addon);
      const itemMonthly = monthlyPrice * quantity;
      const itemSetup = addon.setupUsd * quantity;
      const suffix = isLt && monthlyPrice > 0 && !addon.freeInCloud ? ' (Ціна Cloud)' : '';
      // Безкоштовне впровадження в тексті клієнту не згадуємо.
      const setupSuffix = itemSetup > 0
        ? ` (Впровадження: ${addon.setupIsFrom ? 'від ' : ''}$${itemSetup})`
        : '';

      monthlyUah += itemMonthly;
      setupUsd += itemSetup;
      const priceLabel = monthlyPrice === 0 ? `ліцензія безкоштовна${addon.freeInCloud && !isLt ? ', входить у пакет' : ''}` : `+${itemMonthly} грн/міс`;
      details.push(`${addon.originalName} x${quantity}: ${priceLabel}${suffix}${setupSuffix}`);
    });

    return { monthlyUah, setupUsd, details };
  };

  const buildClientMessage = (calculation) => {
    const totalSetupLabel = calculation.setupUsd > 0 ? `+${calculation.setupUsd}$` : '0$';

    return `Вітаю!

Прошу погодити вартість:
- ліцензія + ${calculation.monthlyUah} грн/міс до поточного рахунку з урахуванням знижки 50% до кінця воєнного положення
- впровадження: ${totalSetupLabel}

Деталізація:
${calculation.details.map((detail) => `- ${detail}`).join('\n')}`;
  };

  // ---------- Controls ----------

  const createStepper = ({ limits, label, labelledBy = '', large = false, getValue, setValue }) => {
    const root = createNode('div', large ? 'stepper stepper--large' : 'stepper');
    const minusButton = createNode('button', 'stepper__btn', '−');
    const input = createNode('input', 'stepper__input');
    const plusButton = createNode('button', 'stepper__btn stepper__btn--plus', '+');

    minusButton.type = 'button';
    minusButton.setAttribute('aria-label', `Зменшити: ${label}`);
    plusButton.type = 'button';
    plusButton.setAttribute('aria-label', `Збільшити: ${label}`);
    input.type = 'number';
    input.inputMode = 'numeric';
    input.min = String(limits.min);
    input.max = String(limits.max);
    input.step = '1';
    if (labelledBy) {
      input.setAttribute('aria-labelledby', labelledBy);
    } else {
      input.setAttribute('aria-label', label);
    }

    const sync = () => {
      const value = getValue();
      if (document.activeElement !== input || Number.parseInt(input.value, 10) !== value) {
        input.value = String(value);
      }
      minusButton.setAttribute('aria-disabled', String(value <= limits.min));
      plusButton.setAttribute('aria-disabled', String(value >= limits.max));
    };

    minusButton.addEventListener('click', () => setValue(clamp(getValue() - 1, limits)));
    plusButton.addEventListener('click', () => setValue(clamp(getValue() + 1, limits)));
    input.addEventListener('focus', () => input.select());
    input.addEventListener('input', () => {
      const parsedValue = Number.parseInt(input.value, 10);
      if (Number.isFinite(parsedValue)) {
        setValue(clamp(parsedValue, limits));
      }
    });
    input.addEventListener('blur', sync);

    root.append(minusButton, input, plusButton);
    return { root, sync };
  };

  function setDeployment(deployment, { silent = false } = {}) {
    state.deployment = deployment;
    if (deployment === DEPLOYMENT.lt) {
      state.addedFronts = 0;
      DATA?.addonLicenses.filter((addon) => addon.cloudOnly).forEach((addon) => state.addonQuantities.delete(addon.id));
    }
    if (!silent) {
      update();
    }
  }

  const currentFrontsStepper = createStepper({
    limits: LIMITS.currentFronts,
    label: 'Поточні фронти',
    labelledBy: 'currentFrontsLabel',
    large: true,
    getValue: () => state.currentFronts,
    setValue: (value) => {
      state.currentFronts = value;
      update();
    }
  });
  currentFrontsField.insertBefore(currentFrontsStepper.root, currentFrontsUnit);

  const addedFrontsStepper = createStepper({
    limits: LIMITS.addedFronts,
    label: 'Кількість нових фронтів',
    labelledBy: 'addedFrontsLabel',
    large: true,
    getValue: () => state.addedFronts,
    setValue: (value) => {
      state.addedFronts = value;
      update();
    }
  });
  addedFrontsField.appendChild(addedFrontsStepper.root);

  const getSupplyText = (item) => (state.deployment === DEPLOYMENT.cloud ? item.supplyCloud : item.supplyLt);

  const getSupplyPrefix = () => (state.deployment === DEPLOYMENT.cloud ? 'Cloud: ' : 'LT: ');

  const renderStock = (node, moduleId) => {
    const count = getServerLicenseCount(moduleId);
    node.hidden = count === null;
    if (count === null) {
      node.replaceChildren();
      return;
    }

    node.classList.toggle('addon__stock--present', count > 0);
    node.title = count > 0 ? `На сервері вже є ${count} шт.` : 'Цієї ліцензії на сервері немає';
    node.replaceChildren(
      document.createTextNode('Зараз наявно: '),
      createNode('span', 'addon__stock-value', String(count))
    );
  };

  let addonRows = [];

  const buildAddonRow = (addon) => {
    const row = createNode('article', 'addon');
    const body = createNode('div', 'addon__body');
    const head = createNode('div', 'addon__head');
    const title = createNode('h3', 'addon__title', addon.originalName);
    title.id = `addon-title-${addon.id}`;
    head.appendChild(title);

    if (addon.description) {
      const tip = createNode('span', 'info-tip');
      tip.tabIndex = 0;
      tip.setAttribute('role', 'img');
      tip.setAttribute('aria-label', addon.description);
      const bubble = createNode('span', 'info-tip__bubble', addon.description);
      bubble.setAttribute('aria-hidden', 'true');
      tip.append(createIcon('i-info'), bubble);
      head.appendChild(tip);
    }

    const code = createNode('p', 'addon__code', addon.name);
    code.title = addon.name;
    const supply = createNode('p', 'supply');
    body.append(head, code, supply);
    if (addon.note) {
      body.appendChild(createNode('p', 'addon__note', addon.note));
    }
    const warning = createNode('p', 'addon__warning', 'Потрібна підписка Enterprise');
    warning.hidden = true;
    body.appendChild(warning);

    const footer = createNode('div', 'addon__footer');
    const price = createNode('span', 'addon__price');
    footer.append(
      price,
      createNode('span', 'addon__setup', `Впровадження: ${addon.setupUsd > 0 ? `${addon.setupIsFrom ? 'від ' : ''}$${addon.setupUsd}` : 'безкоштовно'}`)
    );

    const control = createNode('div', 'addon__control');
    const stock = createNode('p', 'addon__stock');
    stock.hidden = true;

    const stepper = createStepper({
      limits: LIMITS.addon,
      label: addon.originalName,
      labelledBy: title.id,
      getValue: () => state.addonQuantities.get(addon.id) || 0,
      setValue: (value) => {
        if (!isAddonAvailable(addon)) return;
        const previous = state.addonQuantities.get(addon.id) || 0;
        if (value > 0) {
          state.addonQuantities.set(addon.id, value);
        } else {
          state.addonQuantities.delete(addon.id);
        }
        update();
        if (value > 0 && previous === 0) {
          const consultation = getConsultation(addon);
          if (consultation) showConsultation(consultation);
        }
      }
    });

    control.append(stock, stepper.root);
    row.append(body, control, footer);
    (POPULAR_IDS.has(addon.id) || POPULAR_MODULE_IDS.has(addon.moduleId) ? popularAddonList : otherAddonList).appendChild(row);

    return { addon, row, supply, stock, warning, stepper, price };
  };

  const buildAddonRows = () => {
    popularAddonList.replaceChildren();
    otherAddonList.replaceChildren();
    // Кількості зберігаємо лише для ліцензій, що лишились у прайсі.
    const knownIds = new Set(DATA.addonLicenses.map((addon) => addon.id));
    [...state.addonQuantities.keys()].forEach((id) => {
      if (!knownIds.has(id)) {
        state.addonQuantities.delete(id);
      }
    });
    addonRows = DATA.addonLicenses.map(buildAddonRow);
  };

  // ---------- Rendering ----------

  const renderSettings = () => {
    const isLt = state.deployment === DEPLOYMENT.lt;

    deploymentButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.deployment === state.deployment));
    });
    deploymentHint.textContent = isLt ? 'Сервери локально (Lifetime).' : 'Сервери у хмарі (SaaS).';
    deploymentButtons.forEach((button) => { button.title = button.dataset.deployment === DEPLOYMENT.lt ? 'Сервери локально (Lifetime).' : 'Сервери у хмарі (SaaS).'; });

    planGroup.classList.toggle('is-disabled', isLt);
    planButtons.forEach((button) => {
      button.disabled = isLt;
      button.setAttribute('aria-pressed', String(button.dataset.plan === state.plan));
    });
    planHint.hidden = !isLt;
    planHint.textContent = isLt ? 'Для LT тип підписки не застосовується.' : '';
    planGroup.title = planHint.textContent;

    currentFrontsStepper.sync();
    currentFrontsUnit.textContent = `${pluralizeFronts(state.currentFronts)} у клієнта зараз`;
  };

  const renderPos = () => {
    const isLt = state.deployment === DEPLOYMENT.lt;
    posTitle.textContent = !isLt && state.plan === PLAN.enterprise
      ? 'Дозамовлення POS фронт / колл-центр'
      : 'Дозамовлення POS фронт';
    posLtNotice.hidden = !isLt;
    posControls.hidden = isLt;

    addedFrontsStepper.sync();
    const futureTotal = state.currentFronts + Math.max(1, state.addedFronts);
    const tier = resolveFrontTier(futureTotal);
    posTariffHint.textContent = `${formatNumber(getFrontMonthlyCost(tier))} грн/міс за фронт\nвпровадження $${tier.setupUsd}\nстане ${futureTotal} ${pluralizeFronts(futureTotal)}`;

    frontInfoList.replaceChildren(...DATA.frontLicenses.filter((info) => info.moduleId !== '1200').map((info) => {
      const supplyText = getSupplyText(info);
      const isAllowed = !supplyText.includes('неможливе');
      const item = createNode('div', 'front-info__item');
      const main = createNode('div');
      main.append(
        createNode('p', 'front-info__name', info.name),
        createNode('p', 'front-info__module', info.module),
        createNode('p', `supply ${isAllowed ? 'supply--included' : 'supply--blocked'}`, `${getSupplyPrefix()}${supplyText}`)
      );
      const stock = createNode('p', 'addon__stock front-info__stock');
      renderStock(stock, info.moduleId);
      item.append(main, stock);
      return item;
    }));
  };

  const renderAddons = () => {
    const needsEnterpriseHint = state.deployment === DEPLOYMENT.cloud && state.plan === PLAN.pro;

    addonRows.forEach(({ addon, row, supply, stock, warning, stepper, price }) => {
      const supplyText = getSupplyText(addon);
      supply.textContent = `${getSupplyPrefix()}${supplyText}`;
      supply.classList.toggle('supply--included', supplyText.toLowerCase().includes('включена'));

      const available = isAddonAvailable(addon);
      const monthlyPrice = getAddonMonthlyCost(addon);
      price.textContent = available ? (monthlyPrice === 0 ? 'Ліцензія безкоштовна' : `${formatNumber(monthlyPrice)} грн/міс`) : 'Недоступно для LT';
      row.querySelector('.addon__setup').hidden = !available;
      stepper.root.querySelectorAll('button, input').forEach((control) => { control.disabled = !available; });
      stepper.sync();
      row.classList.toggle('is-selected', (state.addonQuantities.get(addon.id) || 0) > 0);
      warning.hidden = !(addon.requiresEnterprise && needsEnterpriseHint);

      renderStock(stock, addon.moduleId);
    });
  };

  const renderSummary = () => {
    const calculation = calculate();
    const monthlyLabel = `+${formatNumber(calculation.monthlyUah)} грн`;
    const setupLabel = `+${formatNumber(calculation.setupUsd)}$`;

    totalMonthlyNode.textContent = monthlyLabel;
    totalSetupNode.textContent = setupLabel;
    bottomMonthlyNode.textContent = monthlyLabel;
    bottomSetupNode.textContent = setupLabel;
    messageText.textContent = buildClientMessage(calculation);
    resetButton.disabled = state.addedFronts === 0 && state.addonQuantities.size === 0;
  };

  function update() {
    if (!DATA) {
      return;
    }

    renderSettings();
    renderPos();
    renderAddons();
    renderSummary();
  }

  // ---------- Pricing from SLM ----------

  const formatPriceDate = (value) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim());
    return match ? `${match[3]}.${match[2]}.${match[1]}` : String(value || '—');
  };

  const setPricingState = (status, message = '') => {
    const isReady = status === 'ready';
    pricingNotice.hidden = isReady;
    workspace.hidden = !isReady;
    pageSummary.hidden = !isReady;
    bottomBar.hidden = !isReady;
    pricingNotice.dataset.state = status;
    pricingNoticeSpinner.hidden = status !== 'loading';
    pricingRetryButton.hidden = status !== 'error';
    pricingNoticeTitle.textContent = status === 'loading' ? 'Завантажую прайс…' : 'Прайс недоступний';
    pricingNoticeText.textContent = status === 'loading'
      ? 'Ціни отримуються з SLM для цього пристрою.'
      : message;
  };

  // Відкрита вкладка перечитує прайс при поверненні на неї, але не частіше
  // за цей інтервал: ліміт запитів у SLM спільний із перевіркою ліцензій.
  const PRICING_REVALIDATE_INTERVAL_MS = 60 * 1000;
  let pricingLoadPromise = null;
  let pricingLoadedAt = 0;

  // ---------- Price change note ----------

  const buildPriceChangeValue = (change) => {
    const value = createNode('span', 'price-changes__value');
    const appendTransition = (from, to, format) => {
      value.append(`${format(from)} → `, createNode('strong', '', format(to)));
      if (from !== null && to !== null && from !== to) {
        value.classList.add(to > from ? 'price-changes__value--up' : 'price-changes__value--down');
      }
    };

    if (change.kind === 'uah' && change.from !== null && change.to !== null) {
      appendTransition(change.from, change.to, formatNumber);
      value.append(' грн/міс');
    } else if (change.kind === 'usd' && change.from !== null && change.to !== null) {
      appendTransition(change.from, change.to, (amount) => `$${formatNumber(amount)}`);
    } else if (change.kind === 'added') {
      value.classList.add('price-changes__value--added');
      value.textContent = change.to !== null ? `додано · ${formatNumber(change.to)} грн/міс` : 'додано';
    } else if (change.kind === 'removed') {
      value.classList.add('price-changes__value--removed');
      value.textContent = 'прибрано';
    } else {
      value.textContent = 'оновлено опис';
    }

    return value;
  };

  const setPriceChangesOpen = (open, { restoreFocus = false } = {}) => {
    priceChangesPopover.hidden = !open;
    priceMetaButton.setAttribute('aria-expanded', String(open));

    if (open) {
      priceChangesPopover.focus();
    } else if (restoreFocus) {
      priceMetaButton.focus();
    }
  };

  const renderPriceChanges = () => {
    const changes = DATA?.priceChanges || [];
    priceMetaButton.disabled = changes.length === 0;
    priceMetaButton.title = changes.length > 0
      ? 'Показати, що змінилось у прайсі'
      : 'Дата прайсу, за яким рахує калькулятор';
    priceChangesTitle.textContent = `Зміни прайсу від ${formatPriceDate(DATA?.priceUpdatedAt)}`;
    priceChangesList.replaceChildren(...changes.map((change) => {
      const item = createNode('li', 'price-changes__item');
      item.append(createNode('span', 'price-changes__name', change.label), buildPriceChangeValue(change));
      return item;
    }));

    if (changes.length === 0 && !priceChangesPopover.hidden) {
      setPriceChangesOpen(false);
    }
  };

  const loadPricing = ({ refresh = false } = {}) => {
    if (pricingLoadPromise) {
      return pricingLoadPromise;
    }

    if (!DATA) {
      setPricingState('loading');
    }

    pricingLoadPromise = sendRuntimeMessage({ action: 'GET_LICENSE_PRICING', refresh })
      .then((response) => {
        pricingLoadedAt = Date.now();

        if (DATA && JSON.stringify(response.pricing) === JSON.stringify(DATA)) {
          return;
        }

        DATA = response.pricing;
        priceUpdatedAtNode.textContent = formatPriceDate(DATA.priceUpdatedAt);
        renderPriceChanges();
        buildAddonRows();
        setPricingState('ready');
        update();
      })
      .catch((error) => {
        if (!DATA) {
          setPricingState('error', error?.message || 'Не вдалося отримати прайс із SLM.');
        }
      })
      .finally(() => {
        pricingLoadPromise = null;
      });

    return pricingLoadPromise;
  };

  const syncThemeToggle = () => {
    const isDark = THEME?.current() === 'dark';
    setIcon(themeToggleIcon, isDark ? 'i-sun' : 'i-moon');
    const label = isDark ? 'Світла тема' : 'Темна тема';
    themeToggle.setAttribute('aria-label', label);
    themeToggle.title = label;
  };

  // ---------- Clipboard ----------

  const writeClipboardText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (error) {
      const textarea = createNode('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const isCopied = document.execCommand('copy');
      textarea.remove();
      if (!isCopied) {
        throw error;
      }
    }
  };

  const setCopyFeedback = (label, iconId) => {
    copyButtonLabel.textContent = label;
    setIcon(copyButtonIcon, iconId);
  };

  const copyMessage = async () => {
    clearTimeout(copyFeedbackTimerId);

    try {
      await writeClipboardText(buildClientMessage(calculate()));
      setCopyFeedback('Скопійовано', 'i-check');
    } catch (error) {
      setCopyFeedback('Не вдалося скопіювати', 'i-warning');
    }

    copyFeedbackTimerId = window.setTimeout(() => setCopyFeedback('Копіювати', 'i-copy'), COPY_FEEDBACK_MS);
  };

  // ---------- Events ----------

  deploymentButtons.forEach((button) => {
    button.addEventListener('click', () => setDeployment(button.dataset.deployment));
  });

  planButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.plan = button.dataset.plan;
      update();
    });
  });

  checkForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!checkButton.disabled) {
      void runLicenseCheck();
    }
  });

  serverInput.addEventListener('input', () => {
    applyDefaultPort();
    if (state.validationError) {
      state.validationError = '';
      renderServerCheck();
    }
  });

  portInput.addEventListener('input', () => {
    if (state.validationError) {
      state.validationError = '';
      renderServerCheck();
    }
  });

  resetButton.addEventListener('click', () => {
    state.addedFronts = 0;
    state.addonQuantities.clear();
    update();
  });

  copyButton.addEventListener('click', () => {
    void copyMessage();
  });

  scrollToMessageButton.addEventListener('click', () => {
    messagePanel.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  });

  themeToggle.addEventListener('click', () => {
    THEME?.toggle();
    syncThemeToggle();
  });

  window.addEventListener('hashchange', () => {
    void applyHash().then((source) => {
      if (source === 'server') {
        checkButton.focus();
      }
    });
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[EXTENSION_KEY_STORAGE_KEY]) {
      void refreshAccessState();

      // Доступ активували в popup — пробуємо ще раз отримати прайс.
      if (!DATA && changes[EXTENSION_KEY_STORAGE_KEY].newValue) {
        void loadPricing({ refresh: true });
      }
    }
  });

  pricingRetryButton.addEventListener('click', () => {
    void loadPricing({ refresh: true });
  });

  priceMetaButton.addEventListener('click', () => {
    setPriceChangesOpen(priceChangesPopover.hidden);
  });

  priceChangesClose.addEventListener('click', () => {
    setPriceChangesOpen(false, { restoreFocus: true });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !priceChangesPopover.hidden) {
      setPriceChangesOpen(false, { restoreFocus: true });
    }
  });

  document.addEventListener('pointerdown', (event) => {
    if (!priceChangesPopover.hidden && !event.target.closest('.price-meta')) {
      setPriceChangesOpen(false);
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (
      document.visibilityState === 'visible'
      && DATA
      && Date.now() - pricingLoadedAt >= PRICING_REVALIDATE_INTERVAL_MS
    ) {
      void loadPricing({ refresh: true });
    }
  });

  // ---------- Init ----------

  priceUpdatedAtNode.textContent = '…';
  syncThemeToggle();
  renderServerCheck();
  void loadPricing({ refresh: true });

  void applyHash().then((source) => {
    if (source === 'server') {
      checkButton.focus();
    } else if (!source) {
      serverInput.focus();
    }
  });

  void refreshAccessState();
})();
