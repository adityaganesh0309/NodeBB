"use strict";
// req import, logging output with console
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const validator_1 = __importDefault(require("validator"));
const nconf_1 = __importDefault(require("nconf"));
const meta = __importStar(require("../meta"));
const user = __importStar(require("../user"));
const categories = __importStar(require("../categories"));
const topics = __importStar(require("../topics"));
const privileges = __importStar(require("../privileges"));
const pagination = __importStar(require("../pagination"));
const utils = __importStar(require("../utils"));
const helpers = __importStar(require("./helpers"));
const tagsController = {
    getTag: function (req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const tag = validator_1.default.escape(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            String(utils.cleanUpTag(req.params.tag, meta.config.maximumTagLength)));
            const page = parseInt(req.query.page, 10) || 1;
            const cid = (Array.isArray(req.query.cid) ? req.query.cid : [req.query.cid]);
            const templateData = {
                topics: [],
                tag: tag,
                breadcrumbs: [{
                        text: '[[tags:tags]]',
                        url: '/tags',
                    }, {
                        text: tag,
                    }],
                title: `[[pages:tag, ${tag}]]`,
            };
            const [settings, cids, categoryData, isPrivileged] = yield Promise.all([
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                user.getSettings(req.uid),
                cid || categories.getCidsByPrivilege('categories:cid', req.uid, 'topics:read'),
                helpers.getSelectedCategory(cid),
                user.isPrivileged(req.uid),
            ]);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const start = Math.max(0, (page - 1) * settings.topicsPerPage);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const stop = start + (settings.topicsPerPage) - 1;
            const [topicCount, tids] = yield Promise.all([
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                topics.getTagTopicCount(tag, cids),
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                topics.getTagTidsByCids(tag, cids, start, stop),
            ]);
            templateData.topics = (yield topics.getTopics(tids, req.uid));
            templateData.showSelect = isPrivileged;
            templateData.showTopicTools = isPrivileged;
            templateData.allCategoriesUrl = `tags/${tag}${helpers.buildQueryString(req.query, 'cid', '')}`;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            templateData.selectedCategory = categoryData.selectedCategory;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            templateData.selectedCids = categoryData.selectedCids;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            topics.calculateTopicIndices(templateData.topics, start);
            res.locals.metaTags = [
                {
                    name: 'title',
                    content: tag,
                },
                {
                    property: 'og:title',
                    content: tag,
                },
            ];
            const pageCount = Math.max(1, Math.ceil(topicCount / settings.topicsPerPage));
            templateData.pagination = pagination.create(page, pageCount, req.query);
            helpers.addLinkTags({ url: `tags/${tag}`, res: req.res, tags: templateData.pagination.rel });
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            templateData['feeds:disableRSS'] = meta.config['feeds:disableRSS'];
            const relativePath = nconf_1.default.get('relative_path');
            templateData.rssFeedUrl = `${relativePath}/tags/${tag}.rss`;
            res.render('tag', templateData);
        });
    },
    getTags: function (req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const cids = yield categories.getCidsByPrivilege('categories:cid', req.uid, 'topics:read');
            const [canSearch, tags] = yield Promise.all([
                privileges.global.can('search:tags', req.uid),
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                topics.getCategoryTagsData(cids, 0, 99),
            ]);
            res.render('tags', {
                tags: tags.filter(Boolean),
                displayTagSearch: canSearch,
                nextStart: 100,
                breadcrumbs: helpers.buildBreadcrumbs([{ text: '[[tags:tags]]' }]),
                title: '[[pages:tags]]',
            });
        });
    },
};
module.exports = tagsController;
