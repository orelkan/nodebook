const { sortBy } = require('lodash');
const logger = require('../logger');

/**
 * Returns the matches sorted by business logic to give the user
 * its best match. The matches are assumed to already be filtered.
 * Sorts by factored score of common hobbies and geo distance.
 * @param user
 * @param matches
 * @returns {*}
 */
function sortUserMatches(user, matches) {
  const userHobbies = new Set(user.hobbies);
  return sortBy(matches, potentialMatch => {
    const commonHobbiesCount =
      potentialMatch.hobbies.filter(hobby => userHobbies.has(hobby)).length;
    const distance = pointDistance(user.location, potentialMatch.location);

    // Minus to make it in descending order
    const score = -(commonHobbiesCount - Math.sqrt(distance));
    const { id, first_name, last_name } = potentialMatch;
    logger.info(`Score for ${id} ${first_name} ${last_name}: ${score}`);
    return score;
  });
}

function pointDistance(point1, point2) {
  const { x: x1, y: y1 } = point1;
  const { x: x2, y: y2 } = point2;
  return Math.hypot(x2-x1, y2-y1);
}

const isSubsetOf = (fullCollection, subsetCollection) =>
  subsetCollection.every(val => fullCollection.includes(val));

module.exports = { sortUserMatches, isSubsetOf };