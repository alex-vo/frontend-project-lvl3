import * as yup from 'yup';
import { ValidationError } from 'yup';
import i18next from 'i18next';
import axios from 'axios';
import initDictionary from './dictionary';

export default () => {
  const schema = yup.object().shape({
    rss: yup.string().url('must-be-valid-url').required('required-field'),
  });

  // eslint-disable-next-line no-undef
  const form = document.querySelector('form');

  const formFields = {};

  form.querySelectorAll('input')
    .forEach((input) => {
      const feedbackContainer = input.nextElementSibling;
      input.addEventListener('focus', () => {
        input.classList.remove('is-valid');
        input.classList.remove('is-invalid');
        feedbackContainer.classList.remove('invalid-feedback');
        feedbackContainer.classList.remove('valid-feedback');
        feedbackContainer.innerHTML = '';
      });
      formFields[input.name] = { input, feedbackContainer };
    });

  const state = {
    feedUrls: [],
    feeds: [],
    posts: [],
    popupOpen: false,
  };

  let feedIdSequence = 0;

  const showError = (path, message) => {
    formFields[path].feedbackContainer.innerHTML = message;
    formFields[path].input.classList.remove('is-valid');
    formFields[path].input.classList.add('is-invalid');
    formFields[path].feedbackContainer.classList.add('invalid-feedback');
    formFields[path].feedbackContainer.classList.remove('valid-feedback');
  };

  const showSuccess = (path, message) => {
    formFields[path].feedbackContainer.innerHTML = message;
    formFields[path].feedbackContainer.classList.remove('invalid-feedback');
    formFields[path].feedbackContainer.classList.add('valid-feedback');
    formFields[path].input.classList.add('is-valid');
    formFields[path].input.classList.remove('is-invalid');
  };

  const htmlToElement = (html) => {
    // eslint-disable-next-line no-undef
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild;
  };

  const renderPosts = () => {
    if (state.popupOpen) {
      return Promise.resolve();
    }
    const postsToShow = state.posts.filter((p) => !p.shown);
    // eslint-disable-next-line no-undef
    const postList = document.querySelector('#posts');
    for (const post of postsToShow) {
      const postElement = htmlToElement(`
        <li style="background-color: #484848;" class="list-group-item d-flex justify-content-between align-items-start border-0 border-end-0">
        </li>`);
      const link = htmlToElement(`<a href="${post.link}" id="bla${post.guid}Link" class="fw-bold" data-id="2" target="_blank" rel="noopener noreferrer">${post.title}</a>`);
      link.addEventListener('click', () => {
        link.classList.remove('fw-bold');
        link.classList.add('fw-normal');
      });
      const modal = htmlToElement(`
      <div class="modal fade ${post.guid}" id="bla${post.guid}" tabindex="-1" aria-labelledby="bla${post.guid}Label" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="bla${post.guid}Label">Modal title</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              ${post.description}
            </div>
            <div class="modal-footer">
              <a class="btn btn-primary full-article" href="${post.link}" role="button" target="_blank" rel="noopener noreferrer">Читать полностью</a>
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Закрыть</button>
            </div>
          </div>
        </div>
      </div>
    `.trim());
      modal.addEventListener('show.bs.modal', () => {
        link.classList.remove('fw-bold');
        link.classList.add('fw-normal');
      });
      postElement.append(
        link,
        htmlToElement(`<button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#bla${post.guid}">${i18next.t('view')}</button>`),
        modal,
      );
      postList.prepend(postElement);
      post.shown = true;
    }

    return Promise.resolve();
  };

  const renderFeeds = () => {
    // eslint-disable-next-line no-undef
    const feedList = document.querySelector('#feeds');
    const feedsToShow = state.feeds.filter((f) => !f.shown);
    for (const feed of feedsToShow) {
      const feedElement = htmlToElement(`<li style="background-color: #484848;" class="list-group-item border-0 border-end-0"><h3 class="h6 m-0">${feed.title}</h3>
            <p class="m-0 small text-black-50">${feed.description}</p></li>`);
      feedList.prepend(feedElement);
      feed.shown = true;
    }
    return Promise.resolve();
  };

  const addFeed = (id, url) =>
    axios.get(`https://hexlet-allorigins.herokuapp.com/raw?disableCache=true&url=${url}`)
      .then((res) => {
        // eslint-disable-next-line no-undef
        const doc = new DOMParser().parseFromString(res.data, 'application/xml');
        const docTitle = doc.querySelector('channel>title').textContent;
        const docDescription = doc.querySelector('channel>description').textContent;
        if (state.feeds.findIndex((feed) => feed.title === docTitle
          && feed.description === docDescription) < 0) {
          state.feeds.unshift({
            id,
            title: docTitle,
            description: docDescription,
            shown: false,
          });
        }
        doc.querySelectorAll('item').forEach((item) => {
          const itemGuid = item.querySelector('guid').textContent;
          if (state.posts.findIndex((post) => post.guid === itemGuid) >= 0) {
            return;
          }
          state.posts.unshift({
            feedId: id,
            guid: item.querySelector('guid').textContent,
            title: item.querySelector('title').textContent,
            link: item.querySelector('link').textContent,
            description: item.querySelector('description').textContent,
            shown: false,
          });
        });
      });

  const checkFeeds = () => {
    setTimeout(() => {
      state.feedUrls.forEach(({ id, url }) => addFeed(id, url));
      checkFeeds();
    }, 5000);
  };

  const handle = (submittedForm) => {
    for (const input of Object.keys(formFields)) {
      formFields[input].input.classList.remove('is-invalid');
    }

    let feedId = null;
    schema.validate(submittedForm)
      .then(({ rss }) => {
        if (state.feedUrls.findIndex((feed) => feed.url === rss) >= 0) {
          throw new ValidationError('rss-duplicate');
        } else {
          feedIdSequence += 1;
          feedId = feedIdSequence;
          return addFeed(feedId, rss)
            .then(() => rss);
        }
      })
      .then((rss) => {
        state.feedUrls.push({ id: feedId, url: rss });
        form.reset();
        showSuccess('rss', i18next.t('rss-successfully-added'));
        return Promise.all([renderFeeds(), renderPosts()]);
      })
      .catch((error) => {
        if (feedId !== null) {
          state.feeds = state.feeds.filter((feed) => feed.id !== feedId);
          state.posts = state.posts.filter((post) => post.feedId !== feedId);
        }
        if (error instanceof ValidationError) {
          const errorMessage = error.errors.map((e) => i18next.t(e)).join(', ');
          showError('rss', errorMessage);
        } else {
          showError('rss', i18next.t('invalid-rss'));
        }
      });
  };

  initDictionary();
  checkFeeds();

  // eslint-disable-next-line no-undef
  document.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    // eslint-disable-next-line no-undef
    const fd = new FormData(e.target);
    handle({ rss: fd.get('rss') });
  });
};
