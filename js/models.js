"use strict";

const BASE_URL = "https://hack-or-snooze-v3.herokuapp.com";

/******************************************************************************
 * Story: a single story in the system
 */

class Story {

  /** Make instance of Story from data object about story:
   *   - {title, author, url, username, storyId, createdAt}
   */

  constructor({ storyId, title, author, url, username, createdAt }) {
    this.storyId = storyId;
    this.title = title;
    this.author = author;
    this.url = url;
    this.username = username;
    this.createdAt = createdAt;
  }

  /** Parses hostname out of URL and returns it. */

  getHostName() {
    let reg = /(?<=http:\/\/|https:\/\/)(.*?\..*?)(?=\/|$)/;
    return reg.exec(this.url)[0];

  }
}


/******************************************************************************
 * List of Story instances: used by UI to show story lists in DOM.
 */

class StoryList {
  constructor(stories) {
    this.stories = stories;
  }

  /** Generate a new StoryList. It:
   *
   *  - calls the API
   *  - builds an array of Story instances
   *  - makes a single StoryList instance out of that
   *  - returns the StoryList instance.
   */

  static async getStories() {
    // Note presence of `static` keyword: this indicates that getStories is
    //  **not** an instance method. Rather, it is a method that is called on the
    //  class directly. Why doesn't it make sense for getStories to be an
    //  instance method?

    // query the /stories endpoint (no auth required)
    const response = await axios({
      url: `${BASE_URL}/stories`,
      method: "GET",
    });

    // turn plain old story objects from API into instances of Story class
    const stories = response.data.stories.map(story => new Story(story));

    // build an instance of our own class using the new array of stories
    return new StoryList(stories);
  }

  /** Adds story data to API, makes a Story instance, adds it to story list.
   * - user - the current instance of User who will post the story
   * - obj of {title, author, url}
   *
   * Returns the new Story instance
   */



  static async addStory(user, {title, author, url}) {
    let reqUrl = BASE_URL + '/stories';
    let body = {
      'token': user.loginToken,
      "story": {
        author,
        title,
        url
      }
    };
    let data = await this.makeStoryRequest(reqUrl, body, 'POST');
    return new Story(data.story);
  }

  static async deleteStory(user, storyId){
    let reqUrl = BASE_URL + `/stories/${storyId}`;
    let body = { 'token': user.loginToken };
    let data = await this.makeStoryRequest(reqUrl, body, 'DELETE');
    return new Story(data.story);
  }

  static async makeStoryRequest(url, body, method){
    body = JSON.stringify(body);

    let resp = await fetch(url, { headers: { Accept: "application/json" }, method, body });
    if (!resp.ok) {
      throw new Error(`Error! Status: ${resp.status}`);
    }
    return resp.json();
    
  }

  // not for deleting from api
  removeById(storyId){
    let index = this.stories.findIndex(story => story.storyId == storyId);
    if(index > -1){
      this.stories.splice(index, 1);
    }
  }
}
/******************************************************************************
 * User: a user in the system (only used to represent the current user)
 */

class User {
  /** Make user instance from obj of user data and a token:
   *   - {username, name, createdAt, favorites[], ownStories[]}
   *   - token
   */

  constructor({
    username,
    name,
    createdAt,
    favorites = [],
    ownStories = []
  },
    token) {
    this.username = username;
    this.name = name;
    this.createdAt = createdAt;

    // instantiate Story instances for the user's favorites and ownStories
    this.favorites = favorites.map(s => new Story(s));
    this.ownStories = ownStories.map(s => new Story(s));

    // store the login token on the user so it's easy to find for API calls.
    this.loginToken = token;
  }

  async addFavorite(story){

  }

  /** Register new user in API, make User instance & return it.
   *
   * - username: a new username
   * - password: a new password
   * - name: the user's full name
   */

  static async signup(username, password, name) {
    const response = await axios({
      url: `${BASE_URL}/signup`,
      method: "POST",
      data: { user: { username, password, name } },
    });
    return new User(
      {
        username: response.data.user.username,
        name: response.data.user.name,
        createdAt: response.data.user.createdAt,
        favorites: response.data.user.favorites,
        ownStories: response.data.user.stories
      },
      response.data.token
    );
  }
  

  async addFavorite(story) {
    await this.alterFavorites(story, 'POST');
  }

  async deleteFavorite(story){
    await this.alterFavorites(story, 'DELETE');
  }

  // logic for both delete and add favorites method
  async alterFavorites(story, method){
    let resp = await this.alterFavoritesApi(story, method);

    if (resp.ok) {
      this.alterFavoritesList(story, method);
    }
  }

  async alterFavoritesApi(story, method){
    let postUrl = BASE_URL + `/users/${this.username}/favorites/${story.storyId}`;

    let body = { token: this.loginToken };
    body = JSON.stringify(body);
    return fetch(postUrl, { headers: {Accept: 'application/json'}, method, body });
  }

  async alterFavoritesList(story, method){
    if(method === 'POST'){
      this.favorites.push(story);
    }
    else{
      this.favorites = this.favorites.filter(favStory => {
        return favStory.storyId !== story.storyId; 
      });
    }
  }

  /** Login in user with API, make User instance & return it.

   * - username: an existing user's username
   * - password: an existing user's password
   */

  static async login(username, password) {
    const response = await axios({
      url: `${BASE_URL}/login`,
      method: "POST",
      data: { user: { username, password } },
    });

    let { user } = response.data;

    return new User(
      {
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
        favorites: user.favorites,
        ownStories: user.stories
      },
      response.data.token
    );
  }

  /** When we already have credentials (token & username) for a user,
   *   we can log them in automatically. This function does that.
   */

  static async loginViaStoredCredentials(token, username) {
    try {
      const response = await axios({
        url: `${BASE_URL}/users/${username}`,
        method: "GET",
        params: { token },
      });

      let { user } = response.data;

      return new User(
        {
          username: user.username,
          name: user.name,
          createdAt: user.createdAt,
          favorites: user.favorites,
          ownStories: user.stories
        },
        token
      );
    } catch (err) {
      console.error("loginViaStoredCredentials failed", err);
      return null;
    }
  }




}
