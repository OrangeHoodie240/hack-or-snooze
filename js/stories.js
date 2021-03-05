"use strict";

// This is the global list of the stories, an instance of StoryList
let storyList;

/** Get and show stories when site first loads. */

async function getAndShowStoriesOnStart() {
  storyList = await StoryList.getStories();
  $storiesLoadingMsg.remove();

  putStoriesOnPage();
}

/**
 * A render method to render HTML for an individual Story instance
 * - story: an instance of Story
 *
 * Returns the markup for the story.
 */

function generateStoryMarkup(story) {
  const hostName = story.getHostName();
  
  let s = `<li id="${story.storyId}">
             <a href="${story.url}" target="a_blank" class="story-link">
              ${story.title}
             </a>
             <small class="story-hostname">(${hostName})</small>
             <small class="story-author">by ${story.author}</small>
             <small class="story-user">posted by ${story.username}</small>
            ${getIcon(story.storyId)}
            <br /.
           </li>
        `;
  return $(s);
}

// for displaying an item as a favorite or not a favorite
function getIcon(storyId, withDiv = true){
  if(currentUser){
    let s = (withDiv) ? '<div class="favoritable">' : '';
    if(currentUser.favorites.find(favorite => favorite.storyId === storyId)){
      s += '<i class="fas fa-heart"></i>'
    }
    else{
      s +=  '<i class="far fa-heart"></i>'
    }
    return s += (withDiv) ? '</div>' : '';
  }
  else{
    return '';
  }
}

/** Gets list of stories from server, generates their HTML, and puts on page. */

function putStoriesOnPage() {
  console.debug("putStoriesOnPage");

  $allStoriesList.empty();

  // loop through all of our stories and generate HTML for them
  for (let story of storyList.stories) {
    const $story = generateStoryMarkup(story);
    $allStoriesList.append($story);
  }

  $allStoriesList.show();
}

/*
  Get's User  static async loginViaStoredCredentials(token, username) {
  await checkForRememberedUser()
*/

async function submitStory(evt) {
  evt.preventDefault();
  if (currentUser) {
    let storyData = buildStoryData(); 

    let story = await StoryList.addStory(currentUser, storyData);
    generateStoryMarkup(story).prependTo('#all-stories-list')

    resetForm();
  }
}
$submitForm.on('submit', submitStory);

function buildStoryData(){
    let author = $('input[name="author"]').val();
    let title = $('input[name="title"]').val();
    let url = $('input[name="url"]').val();
    return { author, title, url };
}

function resetForm(){
  $('#form-story input').val('');
  $formSection.hide();
}

async function toggleFavorite({target}){
  let parent = target.parentElement; 
  if(parent.classList.contains('favoritable')){
    // get storyId and attempt to find in user's favorites
    let storyId = parent.parentElement.id; 
    let story = currentUser.favorites.find(story => story.storyId === storyId);
    if(story){
      await currentUser.deleteFavorite(story);
    }
    else{

      // find story and add it to user's favorites 
      story = storyList.stories.find(story => story.storyId === storyId)
      await currentUser.addFavorite(story);
    }

    // toggle icon on page
    parent.innerHTML = getIcon(storyId, false);
  }
}
$allStoriesList.click(toggleFavorite);

function loadFavoriteStories(){
  $allStoriesList.html('');
  for(let favorite of currentUser.favorites){
    let $li = generateStoryMarkup(favorite);
    $allStoriesList.append($li);
  }
  $formSection.hide(); 
}
$navFavorites.click(loadFavoriteStories);

async function loadMySubmissions(){
  let stories = await getMyStories();

  $allStoriesList.html('');
  for(let story of stories){
    let $li = generateStoryMarkup(story);
    $li.get(0).querySelector('.favoritable').remove();
    $('<div class="deletable"><i class="fas fa-backspace"></i></div>').appendTo($li);
    $allStoriesList.append($li);
  }
  $formSection.hide();
}
$navMySubmissions.click(loadMySubmissions);

async function getMyStories(){
  let stories = await StoryList.getStories();
  stories = stories.stories; 
  return stories.filter(story => story.username === currentUser.username);
}

async function deleteHandler({target}){
  if(target.parentElement.classList.contains('deletable')){
    let li = target.parentElement.parentElement; 
    let storyId = li.id; 
    
    // remove from api
    await StoryList.deleteStory(currentUser, storyId); 
    
    // remove li from page
    li.remove(); 
    
    // remove story from storyList
    storyList.removeById(storyId);    
  } 
  
}
$allStoriesList.click(deleteHandler);