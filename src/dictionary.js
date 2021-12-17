import i18next from 'i18next';

export default () => {
  i18next.init({
    lng: 'en', // if you're using a language detector, do not define the lng option
    resources: {
      en: {
        translation: {
          'rss-successfully-added': 'RSS успешно загружен',
          'rss-duplicate': 'RSS уже существует',
          'must-be-valid-url': 'Ссылка должна быть валидным URL',
          'required-field': 'Не должно быть пустым',
          'invalid-rss': 'Ресурс не содержит валидный RSS',
          view: 'Просмотр',
        },
      },
    },
  });
};
