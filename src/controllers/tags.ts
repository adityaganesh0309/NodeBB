import { Request, Response } from 'express';
import validator from 'validator';
import nconf from 'nconf';
import * as meta from '../meta';
import * as user from '../user';
import * as categories from '../categories';
import * as topics from '../topics';
import * as privileges from '../privileges';
import * as pagination from '../pagination';
import * as utils from '../utils';
import * as helpers from './helpers';

// ChatGPT and Google were heavily used for this translation

interface Crumb {
    text: string;
    url: string;
}

interface Settings {
    topicsPerPage: number;
}

interface SelectedCategory {
    icon: string;
    name: string;
    bgColor: string;
}

interface CategoryData {
    selectedCategory?: SelectedCategory | null;
    selectedCids?: number[];
}

interface Pagination {
    rel: never[];
    pages: {
        page: number;
        active: boolean;
        qs: string;
    }[];
    currentPage: number;
    pageCount: number;
}

interface TemplateData {
    topics: string[];
    tag: string;
    breadcrumbs: Crumb[];
    title: string;
    showSelect?: boolean;
    showTopicTools?: boolean;
    allCategoriesUrl?: string;
    pagination?: Pagination;
    rssFeedUrl?: string;
    'feeds:disableRSS'?: boolean;
    selectedCategory?: SelectedCategory | null;
    selectedCids?: number[];
}

const tagsController: {
    getTag: (req: Request & { uid: number }, res: Response) => Promise<void>;
    getTags: (req: Request & { uid: number }, res: Response) => Promise<void>;
    } = {
        getTag: async function (req: Request & { uid: number }, res: Response) {
            console.log('');
            console.log('req cids:', req.query.cid);
            console.log('req tag:', req.params.tag);
            const tag: string = validator.escape(
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                utils.cleanUpTag(req.params.tag, meta.config.maximumTagLength) as string
            );
            const page: number = parseInt(req.query.page as string, 10) || 1;
            const cid: string[] = (Array.isArray(req.query.cid) ? req.query.cid : [req.query.cid]) as string[];

            console.log('cids', cid);

            const templateData: TemplateData = {
                topics: [],
                tag: tag,
                breadcrumbs: helpers.buildBreadcrumbs([{ text: '[[tags:tags]]', url: '/tags' }, { text: tag }]),
                title: `[[pages:tag, ${tag}]]`,
            };

            const [settings, cids, categoryData, isPrivileged]: [Settings, string[], CategoryData,
            boolean] = await Promise.all([
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                user.getSettings(req.uid) as Settings,
                cid || categories.getCidsByPrivilege('categories:cid', req.uid, 'topics:read') as string[],
                helpers.getSelectedCategory(cid),
                user.isPrivileged(req.uid) as boolean,
            ]);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const start: number = Math.max(0, (page - 1) * settings.topicsPerPage);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const stop: number = start + (settings.topicsPerPage) - 1;

            console.log('before waiting start:', start);
            console.log('before waiting stop:', stop);
            console.log('before waiting tag:', tag);
            console.log('before waiting cids:', cids);

            const [topicCount, tids]: [number, number[]] = await Promise.all([
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                topics.getTagTopicCount(tag, cids) as number,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                topics.getTagTidsByCids(tag, cids, start, stop) as number[],
            ]);

            console.log('tids:', tids);
            console.log('topicCount:', topicCount);
            console.log('uid:', req.uid);
            console.log('before waiting topics length:', templateData.topics.length);
            templateData.topics = await topics.getTopics(tids, req.uid) as string[];
            console.log('after waiting topics length:', templateData.topics.length);
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
            const pageCount: number = Math.max(1, Math.ceil(topicCount / settings.topicsPerPage));
            templateData.pagination = pagination.create(page, pageCount, req.query);
            helpers.addLinkTags({ url: `tags/${tag}`, res: req.res, tags: templateData.pagination.rel });

            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            templateData['feeds:disableRSS'] = meta.config['feeds:disableRSS'] as boolean;
            const relativePath: string = nconf.get('relative_path') as string;
            templateData.rssFeedUrl = `${relativePath}/tags/${tag}.rss`;
            res.render('tag', templateData);
        },

        getTags: async function (req: Request & { uid: number }, res: Response) {
            const cids = await categories.getCidsByPrivilege('categories:cid', req.uid, 'topics:read') as number[];
            const [canSearch, tags]: [boolean, string[]] = await Promise.all([
                privileges.global.can('search:tags', req.uid) as boolean,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                topics.getCategoryTagsData(cids, 0, 99) as string[],
            ]);

            res.render('tags', {
                tags: tags.filter(Boolean),
                displayTagSearch: canSearch,
                nextStart: 100,
                breadcrumbs: helpers.buildBreadcrumbs([{ text: '[[tags:tags]]' }]),
                title: '[[pages:tags]]',
            });
        },
    };
export = tagsController;
