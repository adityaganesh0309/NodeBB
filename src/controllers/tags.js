"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const validator = __importStar(require("validator"));
const nconf = __importStar(require("nconf"));
const meta = __importStar(require("../meta"));
const user = __importStar(require("../user"));
const categories = __importStar(require("../categories"));
const topics = __importStar(require("../topics"));
const privileges = __importStar(require("../privileges"));
const pagination = __importStar(require("../pagination"));
const utils = __importStar(require("../utils"));
const helpers = __importStar(require("./helpers"));
const tagsController = module.exports;
tagsController.getTag = function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const tag = validator.escape(utils.cleanUpTag(req.params.tag, meta.config.maximumTagLength));
        const page = parseInt(req.query.page, 10) || 1;
        const cid = Array.isArray(req.query.cid) || !req.query.cid ? req.query.cid : [req.query.cid];
        const templateData = {
            topics: [],
            tag: tag,
            breadcrumbs: helpers.buildBreadcrumbs([{ text: '[[tags:tags]]', url: '/tags' }, { text: tag }]),
            title: `[[pages:tag, ${tag}]]`,
            allCategoriesUrl: `tags/${tag}${helpers.buildQueryString(req.query, 'cid', '')}`,
            rssFeedUrl: `${nconf.get('relative_path')}/tags/${tag}.rss`,
        };
        const [settings, cids, categoryData, isPrivileged] = yield Promise.all([
            user.getSettings(req.uid),
            cid || categories.getCidsByPrivilege('categories:cid', req.uid, 'topics:read'),
            helpers.getSelectedCategory(cid),
            user.isPrivileged(req.uid),
        ]);
        const start = Math.max(0, (page - 1) * settings.topicsPerPage);
        const stop = start + settings.topicsPerPage - 1;
        const [topicCount, tids] = yield Promise.all([
            topics.getTagTopicCount(tag, cids),
            topics.getTagTidsByCids(tag, cids, start, stop),
        ]);
        templateData.topics = yield topics.getTopics(tids, req.uid);
        templateData.showSelect = isPrivileged;
        templateData.showTopicTools = isPrivileged;
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
        templateData.feeds = { disableRSS: meta.config['feeds:disableRSS'] };
        res.render('tag', templateData);
    });
};
tagsController.getTags = function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const cids = yield categories.getCidsByPrivilege('categories:cid', req.uid, 'topics:read');
        const [canSearch, tags] = yield Promise.all([
            privileges.global.can('search:tags', req.uid),
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
};
