// Mock setup for addon.cards tests
window.jest = {
  fn: (impl) => {
    const mockFn = function(...args) {
      mockFn.mock.calls.push(args);
      if (mockFn._mockReturnValue !== undefined) {
        return mockFn._mockReturnValue;
      }
      if (mockFn._mockReturnThis) {
        return this || mockFn._mockProxy;
      }
      if (impl) {
        return impl.apply(this, args);
      }
      return undefined;
    };
    mockFn.mock = { calls: [] };
    mockFn._mockProxy = {};

    mockFn.mockReturnThis = function() {
      mockFn._mockReturnThis = true;
      mockFn._mockProxy = Object.assign(mockFn._mockProxy, this);
      return mockFn;
    };

    mockFn.mockReturnValue = function(value) {
      mockFn._mockReturnValue = value;
      return mockFn;
    };

    return mockFn;
  }
};

// Create instance tracking
window._mockInstances = {
  notifications: [],
  actions: [],
  responseBuilders: [],
  cardBuilders: [],
  sections: [],
  keyValues: [],
  buttons: []
};

// Create the CardService mock
window.CardService = {
  newCardBuilder: () => {
    const instance = {
      setHeader: window.jest.fn().mockReturnThis(),
      addSection: window.jest.fn().mockReturnThis(),
      setFixedFooter: window.jest.fn().mockReturnThis(),
      setDisplayStyle: window.jest.fn().mockReturnThis(),
      build: window.jest.fn().mockReturnValue({})
    };
    window._mockInstances.cardBuilders.push(instance);
    return instance;
  },
  newCardHeader: () => ({
    setTitle: window.jest.fn().mockReturnThis(),
    setSubtitle: window.jest.fn().mockReturnThis(),
    setImageUrl: window.jest.fn().mockReturnThis(),
    setImageStyle: window.jest.fn().mockReturnThis()
  }),
  newCardSection: () => {
    const instance = {
      setHeader: window.jest.fn().mockReturnThis(),
      addWidget: window.jest.fn().mockReturnThis(),
      setCollapsible: window.jest.fn().mockReturnThis(),
      setNumUncollapsibleWidgets: window.jest.fn().mockReturnThis(),
      build: window.jest.fn().mockReturnValue({})
    };
    window._mockInstances.sections.push(instance);
    return instance;
  },
  newKeyValue: () => {
    const instance = {
      setContent: window.jest.fn().mockReturnThis(),
      setTopLabel: window.jest.fn().mockReturnThis(),
      setBottomLabel: window.jest.fn().mockReturnThis(),
      setIcon: window.jest.fn().mockReturnThis(),
      setButton: window.jest.fn().mockReturnThis(),
      setMultiline: window.jest.fn().mockReturnThis(),
      setOnClickAction: window.jest.fn().mockReturnThis()
    };
    window._mockInstances.keyValues.push(instance);
    return instance;
  },
  newTextButton: () => {
    const instance = {
      setText: window.jest.fn().mockReturnThis(),
      setOnClickAction: window.jest.fn().mockReturnThis(),
      setIcon: window.jest.fn().mockReturnThis(),
      setTextButtonStyle: window.jest.fn().mockReturnThis(),
      setDisabled: window.jest.fn().mockReturnThis()
    };
    window._mockInstances.buttons.push(instance);
    return instance;
  },
  newAction: () => {
    const instance = {
      setFunctionName: window.jest.fn().mockReturnThis(),
      setParameters: window.jest.fn().mockReturnThis(),
      setLoadIndicator: window.jest.fn().mockReturnThis()
    };
    window._mockInstances.actions.push(instance);
    return instance;
  },
  newNotification: () => {
    const instance = {
      setText: window.jest.fn().mockReturnThis()
    };
    window._mockInstances.notifications.push(instance);
    return instance;
  },
  newActionResponseBuilder: () => {
    const instance = {
      setNotification: window.jest.fn().mockReturnThis(),
      setNavigation: window.jest.fn().mockReturnThis(),
      setStateChanged: window.jest.fn().mockReturnThis(),
      build: window.jest.fn().mockReturnValue({})
    };
    window._mockInstances.responseBuilders.push(instance);
    return instance;
  },
  newNavigation: () => ({
    popCard: window.jest.fn().mockReturnThis(),
    popToRoot: window.jest.fn().mockReturnThis(),
    pushCard: window.jest.fn().mockReturnThis(),
    updateCard: window.jest.fn().mockReturnThis()
  }),
  newDecoratedText: () => ({
    setText: window.jest.fn().mockReturnThis(),
    setTopLabel: window.jest.fn().mockReturnThis(),
    setBottomLabel: window.jest.fn().mockReturnThis(),
    setButton: window.jest.fn().mockReturnThis(),
    setIcon: window.jest.fn().mockReturnThis(),
    setStartIcon: window.jest.fn().mockReturnThis(),
    setOnClickAction: window.jest.fn().mockReturnThis(),
    setWrapText: window.jest.fn().mockReturnThis()
  }),
  newTextInput: () => ({
    setFieldName: window.jest.fn().mockReturnThis(),
    setTitle: window.jest.fn().mockReturnThis(),
    setValue: window.jest.fn().mockReturnThis(),
    setHint: window.jest.fn().mockReturnThis(),
    setMultiline: window.jest.fn().mockReturnThis(),
    setSuggestions: window.jest.fn().mockReturnThis(),
    setOnChangeAction: window.jest.fn().mockReturnThis()
  }),
  newSuggestions: () => ({
    addSuggestion: window.jest.fn().mockReturnThis(),
    addSuggestions: window.jest.fn().mockReturnThis()
  }),
  newDateTimePicker: () => ({
    setFieldName: window.jest.fn().mockReturnThis(),
    setTitle: window.jest.fn().mockReturnThis(),
    setType: window.jest.fn().mockReturnThis(),
    setValueInMsSinceEpoch: window.jest.fn().mockReturnThis(),
    setOnChangeAction: window.jest.fn().mockReturnThis(),
    setTimeZoneOffsetInMins: window.jest.fn().mockReturnThis()
  }),
  newSelectionInput: () => ({
    setFieldName: window.jest.fn().mockReturnThis(),
    setTitle: window.jest.fn().mockReturnThis(),
    setType: window.jest.fn().mockReturnThis(),
    addItem: window.jest.fn().mockReturnThis(),
    setOnChangeAction: window.jest.fn().mockReturnThis()
  }),
  newButtonSet: () => ({
    addButton: window.jest.fn().mockReturnThis()
  }),
  newGrid: () => ({
    setNumColumns: window.jest.fn().mockReturnThis(),
    addItem: window.jest.fn().mockReturnThis(),
    setTitle: window.jest.fn().mockReturnThis(),
    setBorderStyle: window.jest.fn().mockReturnThis(),
    setOnClickAction: window.jest.fn().mockReturnThis()
  }),
  newGridItem: () => ({
    setIdentifier: window.jest.fn().mockReturnThis(),
    setTitle: window.jest.fn().mockReturnThis(),
    setSubtitle: window.jest.fn().mockReturnThis(),
    setImage: window.jest.fn().mockReturnThis(),
    setLayout: window.jest.fn().mockReturnThis(),
    setTextAlignment: window.jest.fn().mockReturnThis()
  }),
  newImage: () => ({
    setImageUrl: window.jest.fn().mockReturnThis(),
    setAltText: window.jest.fn().mockReturnThis()
  }),
  newIconImage: () => ({
    setIcon: window.jest.fn().mockReturnThis(),
    setIconUrl: window.jest.fn().mockReturnThis(),
    setAltText: window.jest.fn().mockReturnThis(),
    setImageCropType: window.jest.fn().mockReturnThis()
  }),
  TextButtonStyle: {
    FILLED: 'FILLED',
    TEXT: 'TEXT'
  },
  BorderType: {
    NO_BORDER: 'NO_BORDER',
    STROKE: 'STROKE'
  },
  ImageCropType: {
    SQUARE: 'SQUARE',
    CIRCLE: 'CIRCLE',
    RECTANGLE_CUSTOM: 'RECTANGLE_CUSTOM',
    RECTANGLE_4_3: 'RECTANGLE_4_3'
  },
  SelectionInputType: {
    CHECK_BOX: 'CHECK_BOX',
    RADIO_BUTTON: 'RADIO_BUTTON',
    DROPDOWN: 'DROPDOWN',
    SWITCH: 'SWITCH'
  },
  GridItemLayout: {
    TEXT_BELOW: 'TEXT_BELOW',
    TEXT_ABOVE: 'TEXT_ABOVE'
  },
  HorizontalAlignment: {
    START: 'START',
    CENTER: 'CENTER',
    END: 'END'
  },
  ImageStyle: {
    SQUARE: 'SQUARE',
    CIRCLE: 'CIRCLE'
  },
  DateTimePickerType: {
    DATE_AND_TIME: 'DATE_AND_TIME',
    DATE_ONLY: 'DATE_ONLY',
    TIME_ONLY: 'TIME_ONLY'
  },
  LoadIndicator: {
    SPINNER: 'SPINNER',
    NONE: 'NONE'
  },
  DisplayStyle: {
    REPLACE: 'REPLACE',
    PEEK: 'PEEK'
  },
  Icon: {
    INBOX: 'INBOX',
    SEND: 'SEND',
    SCHEDULE: 'SCHEDULE',
    STAR: 'STAR',
    LABEL: 'LABEL',
    ARCHIVE: 'ARCHIVE',
    DELETE: 'DELETE',
    UNDO: 'UNDO',
    REFRESH: 'REFRESH',
    SETTINGS: 'SETTINGS',
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    CHECK_CIRCLE: 'CHECK_CIRCLE',
    NONE: 'NONE'
  }
};

// Create the PropertiesService mock
window.PropertiesService = {
  getUserProperties: () => ({
    getProperty: window.jest.fn().mockReturnValue('30'),
    setProperty: window.jest.fn().mockReturnThis(),
    deleteProperty: window.jest.fn().mockReturnThis(),
    getProperties: window.jest.fn().mockReturnValue({})
  }),
  getScriptProperties: () => ({
    getProperty: window.jest.fn().mockReturnValue(''),
    setProperty: window.jest.fn().mockReturnThis(),
    deleteProperty: window.jest.fn().mockReturnThis(),
    getProperties: window.jest.fn().mockReturnValue({})
  })
};

// Export for tests
window.mockCardService = window.CardService;
window.mockPropertiesService = window.PropertiesService;

// Helper to clear mock instances between tests
window.clearMockInstances = function() {
  window._mockInstances.notifications = [];
  window._mockInstances.actions = [];
  window._mockInstances.responseBuilders = [];
  window._mockInstances.cardBuilders = [];
  window._mockInstances.sections = [];
  window._mockInstances.keyValues = [];
  window._mockInstances.buttons = [];
};